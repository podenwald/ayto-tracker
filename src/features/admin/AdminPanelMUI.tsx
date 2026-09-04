import React, { useEffect, useState, useRef } from 'react'
// Avatar utilities removed - using simple fallback logic
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Chip,
  Avatar,
  IconButton,
  Alert,
  Badge,
  Tooltip,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  CircularProgress,
  Divider,
  Paper,
  Collapse,
  InputAdornment,
  useTheme,
  useMediaQuery
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Woman as WomanIcon,
  Man as ManIcon,
  Favorite as FavoriteIcon,
  Upload as UploadIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  HeartBroken as HeartBrokenIcon,
  AttachMoney as AttachMoneyIcon,
  Savings as SavingsIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  LightMode as LightModeIcon,
  Groups as GroupsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  Warning as WarningIcon,
  DeleteSweep as DeleteSweepIcon,
  Backup as BackupIcon,
  HelpOutline as HelpOutlineIcon,
  Cached as CachedIcon,
  Inventory as InventoryIcon,
  Nightlife as NightlifeIcon,
  Schedule as ScheduleIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material'
import AdminLayout from '@/components/layout/AdminLayout'
import { VERSION_INFO } from '@/utils/version'
import BroadcastManagement from './BroadcastManagement'
import { DatabaseUtils, type Participant, type Matchbox, type MatchingNight, type Penalty } from '@/lib/db'
import { getConfirmedPerfectMatchNames, getSmallerGender, getAvailableParticipants } from '@/utils/matchStatus'
import { calculateBudget } from '@/utils/budget'
import { getActiveSeasonId, clearAllDataForSeason, assertSeasonWritable } from '@/services/seasonService'
import { getValidPerfectMatchesForMatchingNight } from '@/utils/broadcastUtils'
import { MatchboxService } from '@/services/matchboxService'
import { MatchingNightService } from '@/services/matchingNightService'
import { PenaltyService } from '@/services/penaltyService'
import { ParticipantService } from '@/services/participantService'
import { buildDeploymentExport } from '@/utils/deploymentExport'
import {
  DEFAULT_COLOR_PREFERENCES,
  isHexColor,
  loadColorPreferences,
  resetColorPreferences,
  saveColorPreferences
} from '@/theme/colorPreferences'
// import { exportCurrentDatabaseState } from '@/utils/jsonImport' // Nicht mehr benötigt, da eigene Implementierung

// ** Legacy JSON Import Typen **
// Lockere Typen für JSON-Import/Backup-Dateien unbekannter Herkunft (Feldnamen/-werte
// variieren je nach Export-Version), die vor dem Speichern normalisiert werden.
interface LegacyParticipantJSON {
  name?: string
  knownFrom?: string
  age?: number | string
  status?: string
  active?: boolean
  photoUrl?: string
  source?: string
  bio?: string
  gender?: string
  socialMediaAccount?: string
}

interface LegacyMatchingNightJSON {
  id?: number
  name?: string
  date?: string
  pairs?: Array<{ woman: string; man: string }>
  totalLights?: number
  matchType?: string
  price?: number
  buyer?: string
  createdAt?: string
  ausstrahlungsdatum?: string
  ausstrahlungszeit?: string
}

interface LegacyMatchboxJSON {
  id?: number
  woman?: string
  man?: string
  womanId?: string
  manId?: string
  matchType?: string
  price?: number
  buyer?: string
  createdAt?: string
  updatedAt?: string
  ausstrahlungsdatum?: string
  ausstrahlungszeit?: string
}

interface LegacyPenaltyJSON {
  id?: number
  participantName?: string
  reason?: string
  amount?: number
  date?: string
  description?: string
  createdAt?: string
}

interface LegacyBackupJSON {
  participants: LegacyParticipantJSON[]
  matchingNights: LegacyMatchingNightJSON[]
  matchboxes: LegacyMatchboxJSON[]
  penalties?: LegacyPenaltyJSON[]
}

// ** Participant Form Component
const ParticipantForm: React.FC<{
  initial?: Participant
  confirmedPerfectMatchNames: Set<string>
  onSaved: () => void
  onCancel?: () => void
}> = ({ initial, confirmedPerfectMatchNames, onSaved, onCancel }) => {
  const [form, setForm] = useState<Participant>(initial ?? {
    seasonId: 0,
    name: '', knownFrom: '', age: undefined, status: 'Aktiv', photoUrl: '', source: '', bio: '', gender: 'F', socialMediaAccount: ''
  })

  useEffect(() => {
    if (initial) setForm(initial)
  }, [initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const oldName = initial?.name?.trim()
      const newName = form.name.trim()

      // Verwende den ParticipantService, damit die Season-Zugehörigkeits-Prüfung greift
      if (form.id) {
        await ParticipantService.updateParticipant(form.id, form)
      } else {
        await ParticipantService.createParticipant(form)
      }

      // Wenn der Name geändert wurde, referenzierte Einträge mitziehen (nur aktive Staffel)
      if (oldName && oldName !== newName) {
        await MatchboxService.renameParticipant(oldName, newName)
        await MatchingNightService.renameParticipantInPairs(oldName, newName)
      }
      onSaved()
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
    }
  }

  return (
    <Card>
      <CardHeader 
        title={initial ? "Kandidat*in bearbeiten" : "Neue*n Kandidat*in hinzufügen"}
        avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><AddIcon /></Avatar>}
      />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3
            }}>
              <TextField
                fullWidth
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Bekannt aus"
                value={form.knownFrom}
                onChange={(e) => setForm({ ...form, knownFrom: e.target.value })}
              />
              <TextField
                fullWidth
                label="Alter"
                type="number"
                value={form.age ?? ''}
                onChange={(e) => setForm({ ...form, age: e.target.value ? parseInt(e.target.value, 10) : undefined })}
              />
              <TextField
                fullWidth
                label="Status"
                value={confirmedPerfectMatchNames.has(form.name || '') ? 'Perfekt Match' : 'Aktiv'}
                InputProps={{ readOnly: true }}
                helperText="Wird automatisch aus den Matchbox-Daten abgeleitet"
              />
              <TextField
                fullWidth
                label="Foto URL"
                value={form.photoUrl ?? ''}
                onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                placeholder="https://..."
              />
              <TextField
                fullWidth
                label="Bildquelle"
                value={form.source ?? ''}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="© RTL / Frank Beer"
                helperText="Wird unten rechtsbündig auf dem Foto angezeigt"
              />
              <TextField
                fullWidth
                label="Social Media Account"
                value={form.socialMediaAccount ?? ''}
                onChange={(e) => setForm({ ...form, socialMediaAccount: e.target.value })}
                placeholder="https://instagram.com/username"
              />
            </Box>
            
            <FormControl component="fieldset">
              <FormLabel component="legend">Geschlecht</FormLabel>
              <RadioGroup
                row
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as 'F' | 'M' })}
              >
                <FormControlLabel value="F" control={<Radio />} label="Frau" />
                <FormControlLabel value="M" control={<Radio />} label="Mann" />
              </RadioGroup>
            </FormControl>
            
            <TextField
              fullWidth
              label="Biografie"
              multiline
              rows={4}
              value={form.bio ?? ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {onCancel && (
                <Button 
                  variant="outlined" 
                  onClick={onCancel}
                  startIcon={<CancelIcon />}
                >
                  Abbrechen
                </Button>
              )}
              <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                {initial ? 'Aktualisieren' : 'Hinzufügen'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}

// ** Participants List Component
const ParticipantsList: React.FC<{
  participants: Participant[]
  confirmedPerfectMatchNames: Set<string>
  onEdit: (participant: Participant) => void
  onDelete: (id: number) => void
  womenLimit: number
  menLimit: number
  onLoadMoreWomen: () => void
  onLoadMoreMen: () => void
}> = ({ participants, confirmedPerfectMatchNames, onEdit, onDelete, womenLimit, menLimit, onLoadMoreWomen, onLoadMoreMen }) => {
  const women = participants.filter(p => p.gender === 'F')
  const men = participants.filter(p => p.gender === 'M')
  
  return (
    <Card>
      <CardContent>
        {/* Gender-based sections */}
        <Box sx={{ mb: 4 }}>
          {/* Women Section */}
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <WomanIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Frauen ({women.length})
              </Typography>
            </Box>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
              gap: 2,
              mb: 4
            }}>
              {women.slice(0, womenLimit).map((participant) => (
                <Card 
                  key={participant.id} 
                  sx={{
                    height: 300,
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    contentVisibility: 'auto',
                    containIntrinsicSize: '0 300px',
                    backgroundImage: (theme) => (participant.photoUrl && participant.photoUrl.trim() !== '')
                      ? `url(${participant.photoUrl})`
                      : participant.gender === 'F'
                        ? `linear-gradient(135deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.dark} 100%)`
                        : `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 100%)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      '& .overlay': {
                        opacity: 1
                      },
                      '& .name-text': {
                        transform: 'translateY(-40px)'
                      },
                      '& .additional-info': {
                        opacity: 1,
                        transform: 'translateY(0)'
                      }
                    }
                  }}
                >
                  {/* Semi-transparent overlay */}
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.3)',
                      opacity: 0.6,
                      transition: 'opacity 0.3s ease-in-out'
                    }}
                  />
                  
                  {/* Active status indicator */}
                    <Badge
                      badgeContent=""
                      color="default"
                      variant="dot"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 3,
                      '& .MuiBadge-dot': {
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        border: '2px solid white',
                        backgroundColor: !confirmedPerfectMatchNames.has(participant.name || '') ? 'success.main' : '#EC4899',
                        // Zusätzliche Sicherheit für pinke Farbe bei Perfekt Matches
                        ...(confirmedPerfectMatchNames.has(participant.name || '') && {
                          backgroundColor: '#EC4899 !important'
                        })
                      }
                    }}
                  />
                  
                  {/* Bildquelle - unten rechtsbündig */}
                  {participant.source && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 12,
                        zIndex: 3
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 500,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)',
                          textAlign: 'right',
                          lineHeight: 1.2
                        }}
                      >
                        {participant.source}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Name - always visible */}
                  <Box
                    className="name-text"
                    sx={{
                      position: 'absolute',
                      bottom: 80,
                      left: 20,
                      right: 20,
                      zIndex: 2,
                      transition: 'transform 0.3s ease-in-out'
                    }}
                  >
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: 'white',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        textAlign: 'center'
                      }}
                    >
                        {participant.name}
                      </Typography>
                  </Box>
                  
                  {/* Additional info - only visible on hover */}
                  <Box
                    className="additional-info"
                    sx={{
                      position: 'absolute',
                      bottom: 20,
                      left: 20,
                      right: 20,
                      zIndex: 2,
                      opacity: 0,
                      transform: 'translateY(20px)',
                      transition: 'all 0.3s ease-in-out',
                      textAlign: 'center'
                    }}
                  >
                        {typeof participant.age === 'number' && (
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: 'white',
                          fontWeight: 'bold',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          mb: 1
                        }}
                      >
                        {participant.age} Jahre
                      </Typography>
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'white',
                        fontWeight: 'medium',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        mb: 2
                      }}
                    >
                      {participant.knownFrom || '—'}
                    </Typography>
                    
                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="Bearbeiten">
                        <IconButton
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(participant)
                          }}
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.3)'
                            }
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {participant.id && (
                        <Tooltip title="Löschen">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(participant.id!)
                            }}
                            sx={{
                              bgcolor: 'rgba(244, 67, 54, 0.8)',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'rgba(244, 67, 54, 1)'
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      </Box>
                    </Box>
                </Card>
              ))}
                  </Box>
            {womenLimit < women.length && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="outlined" onClick={onLoadMoreWomen}>
                  Alle laden
                </Button>
              </Box>
            )}
          </Box>

          {/* Men Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <ManIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Männer ({men.length})
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)'
              },
              gap: 2
            }}>
              {men.slice(0, menLimit).map((participant) => (
                <Card 
                  key={participant.id} 
                  sx={{
                    height: 300,
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    contentVisibility: 'auto',
                    containIntrinsicSize: '0 300px',
                    backgroundImage: (theme) => (participant.photoUrl && participant.photoUrl.trim() !== '')
                      ? `url(${participant.photoUrl})`
                      : participant.gender === 'F'
                        ? `linear-gradient(135deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.dark} 100%)`
                        : `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 100%)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      '& .overlay': {
                        opacity: 1
                      },
                      '& .name-text': {
                        transform: 'translateY(-40px)'
                      },
                      '& .additional-info': {
                        opacity: 1,
                        transform: 'translateY(0)'
                      }
                    }
                  }}
                >
                  {/* Semi-transparent overlay */}
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.3)',
                      opacity: 0.6,
                      transition: 'opacity 0.3s ease-in-out'
                    }}
                  />
                  
                  {/* Active status indicator */}
                  <Badge
                    badgeContent=""
                    color="default"
                    variant="dot"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 3,
                      '& .MuiBadge-dot': {
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        border: '2px solid white',
                        backgroundColor: !confirmedPerfectMatchNames.has(participant.name || '') ? 'success.main' : '#EC4899',
                        // Zusätzliche Sicherheit für pinke Farbe bei Perfekt Matches
                        ...(confirmedPerfectMatchNames.has(participant.name || '') && {
                          backgroundColor: '#EC4899 !important'
                        })
                      }
                    }}
                  />
                  
                  {/* Bildquelle - unten rechtsbündig */}
                  {participant.source && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 12,
                        zIndex: 3
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 500,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)',
                          textAlign: 'right',
                          lineHeight: 1.2
                        }}
                      >
                        {participant.source}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Name - always visible */}
                  <Box
                    className="name-text"
                    sx={{
                      position: 'absolute',
                      bottom: 80,
                      left: 20,
                      right: 20,
                      zIndex: 2,
                      transition: 'transform 0.3s ease-in-out'
                    }}
                  >
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: 'white',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        textAlign: 'center'
                      }}
                    >
                      {participant.name}
                    </Typography>
                  </Box>
                  
                  {/* Additional info - only visible on hover */}
                  <Box
                    className="additional-info"
                    sx={{
                      position: 'absolute',
                      bottom: 20,
                      left: 20,
                      right: 20,
                      zIndex: 2,
                      opacity: 0,
                      transform: 'translateY(20px)',
                      transition: 'all 0.3s ease-in-out',
                      textAlign: 'center'
                    }}
                  >
                    {typeof participant.age === 'number' && (
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: 'white',
                          fontWeight: 'bold',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          mb: 1
                        }}
                      >
                        {participant.age} Jahre
                      </Typography>
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'white',
                        fontWeight: 'medium',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        mb: 2
                      }}
                    >
                    {participant.knownFrom || '—'}
                  </Typography>
                    
                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="Bearbeiten">
                      <IconButton
                        size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(participant)
                          }}
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.3)'
                            }
                          }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {participant.id && (
                      <Tooltip title="Löschen">
                        <IconButton
                          size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(participant.id!)
                            }}
                            sx={{
                              bgcolor: 'rgba(244, 67, 54, 0.8)',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'rgba(244, 67, 54, 1)'
                              }
                            }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  </Box>
                </Card>
              ))}
            </Box>
            {menLimit < men.length && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="outlined" onClick={onLoadMoreMen}>
                  Alle laden
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ** Matchbox Management Component
const MatchboxManagement: React.FC<{
  participants: Participant[]
  matchboxes: Matchbox[]
  onUpdate: () => void
}> = ({ participants, matchboxes, onUpdate }) => {
  const theme = useTheme()
  const isMobileDialog = useMediaQuery(theme.breakpoints.down('sm'))
  const [editingMatchbox, setEditingMatchbox] = useState<Matchbox | undefined>(undefined)
  const [matchboxForm, setMatchboxForm] = useState<Omit<Matchbox, 'id' | 'createdAt' | 'updatedAt' | 'seasonId'>>({
    woman: '',
    man: '',
    matchType: 'no-match',
    price: undefined,
    buyer: undefined,
    ausstrahlungsdatum: undefined,
    ausstrahlungszeit: undefined,
    isDoppelmatch: false,
    doppelmatchPartner: undefined
  })
  const [showDialog, setShowDialog] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const women = participants.filter(p => p.gender === 'F')
  const men = participants.filter(p => p.gender === 'M')
  
  // Beim Bearbeiten bleibt das eigene Paar der Matchbox auswählbar, andere bereits
  // vergebene Kandidat*innen (inkl. Doppelmatch-Partner*in) werden ausgeschlossen (ODI-271, ODI-286).
  const availableWomen = getAvailableParticipants(women, matchboxes, editingMatchbox?.id)
  const availableMen = getAvailableParticipants(men, matchboxes, editingMatchbox?.id)

  // Doppelmatch: nur möglich, wenn die Geschlechterzahl ungleich ist, und nur 1x pro Staffel
  const smallerGender = getSmallerGender(participants)
  const hasDoppelmatchElsewhere = matchboxes.some(mb => mb.isDoppelmatch && mb.id !== editingMatchbox?.id)
  const doppelmatchAvailable = smallerGender !== null && !hasDoppelmatchElsewhere
  // Zweite Partner*in kommt aus dem zahlenmäßig größeren Geschlecht
  const doppelmatchCandidates = (smallerGender === 'F' ? availableMen : availableWomen)
    .filter(p => p.name !== matchboxForm.woman && p.name !== matchboxForm.man)

  const perfectMatches = matchboxes.filter(mb => mb.matchType === 'perfect').length
  const noMatches = matchboxes.filter(mb => mb.matchType === 'no-match').length
  // Verkäufe: Plus = Einnahme, Minus = Ausgabe
  const totalVerkaufMatchboxes = matchboxes
    .filter(mb => mb.matchType === 'sold' && typeof mb.price === 'number')
    .reduce((sum, mb) => sum + (mb.price || 0), 0)

  const resetForm = () => {
    setMatchboxForm({
      woman: '',
      man: '',
      matchType: 'no-match',
      price: undefined,
      buyer: undefined,
      ausstrahlungsdatum: undefined,
      ausstrahlungszeit: undefined,
      isDoppelmatch: false,
      doppelmatchPartner: undefined
    })
    setEditingMatchbox(undefined)
    setShowDialog(false)
  }

  const startEditing = (matchbox: Matchbox) => {
    setEditingMatchbox(matchbox)
    setMatchboxForm({
      woman: matchbox.woman,
      man: matchbox.man,
      matchType: matchbox.matchType,
      price: matchbox.price,
      buyer: matchbox.buyer,
      ausstrahlungsdatum: matchbox.ausstrahlungsdatum,
      ausstrahlungszeit: matchbox.ausstrahlungszeit,
      isDoppelmatch: matchbox.isDoppelmatch,
      doppelmatchPartner: matchbox.doppelmatchPartner
    })
    setShowDialog(true)
  }

  const saveMatchbox = async () => {
    try {
      const validationErrors = MatchboxService.validateMatchbox(matchboxForm, matchboxes, editingMatchbox?.id)
      if (validationErrors.length > 0) {
        setSnackbar({ open: true, message: validationErrors[0], severity: 'error' })
        return
      }

      if (matchboxForm.matchType === 'perfect') {
        const isDuplicate = await MatchboxService.isPerfectMatch(matchboxForm.woman, matchboxForm.man, editingMatchbox?.id)
        if (isDuplicate) {
          setSnackbar({ open: true, message: 'Dieses Paar ist bereits als Perfect Match bestätigt!', severity: 'error' })
          return
        }
      }

      if (editingMatchbox) {
        // Verwende den MatchboxService, damit Season-Prüfung und Perfect-Match-Nebenwirkung greifen
        await MatchboxService.updateMatchbox(editingMatchbox.id!, matchboxForm)
        setSnackbar({ open: true, message: 'Matchbox wurde erfolgreich aktualisiert!', severity: 'success' })
      } else {
        // Verwende den MatchboxService für die Erstellung
        await MatchboxService.createMatchbox({
          ...matchboxForm,
        })
        setSnackbar({ open: true, message: 'Matchbox wurde erfolgreich erstellt!', severity: 'success' })
      }

      resetForm()
      onUpdate()
    } catch (error) {
      console.error('Fehler beim Speichern der Matchbox:', error)
      setSnackbar({ open: true, message: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }

    const deleteMatchbox = async (id: number) => {
      try {
       // Verwende den MatchboxService, damit die Season-Zugehörigkeits-Prüfung greift
       await MatchboxService.deleteMatchbox(id)

        onUpdate()
        setSnackbar({ open: true, message: 'Matchbox wurde erfolgreich gelöscht!', severity: 'success' })
    } catch (error) {
      console.error('Fehler beim Löschen der Matchbox:', error)
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }


  return (
    <Box>

      {/* Action Button with Labels */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setShowDialog(true)}
        >
          Neue Matchbox
        </Button>
        <Chip icon={<FavoriteIcon />} label={`${perfectMatches}`} color="success" size="small" />
        <Chip icon={<HeartBrokenIcon />} label={`${noMatches}`} color="error" size="small" />
        <Chip icon={<AttachMoneyIcon />} label={`${totalVerkaufMatchboxes >= 0 ? '+' : ''}${totalVerkaufMatchboxes.toLocaleString('de-DE')} €`} sx={{ bgcolor: '#9c27b0', color: 'white', '& .MuiChip-icon': { color: 'white' } }} size="small" />
        {editingMatchbox && (
          <Button variant="outlined" onClick={resetForm}>
            Bearbeitung abbrechen
          </Button>
        )}
      </Box>

      {/* Matchboxes List */}
      <Card>
        <CardHeader 
          title={`Matchboxes (${matchboxes.length})`}
          avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}><InventoryIcon sx={{ color: 'white' }} /></Avatar>}
        />
        <CardContent>
          {matchboxes.length === 0 ? (
            <Alert severity="info">Noch keine Matchboxes vorhanden</Alert>
          ) : (
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2
            }}>
              {matchboxes
                .sort((a, b) => {
                  const dateA = a.ausstrahlungsdatum ? new Date(a.ausstrahlungsdatum).getTime() : 0
                  const dateB = b.ausstrahlungsdatum ? new Date(b.ausstrahlungsdatum).getTime() : 0
                  return dateB - dateA
                })
                .map((matchbox) => (
                <Card key={matchbox.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                          bgcolor: matchbox.matchType === 'perfect' ? 'success.main' : 
                                  matchbox.matchType === 'sold' ? 'info.main' : 'error.main'
                        }}>
                          <FavoriteIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {matchbox.woman} + {matchbox.man}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip 
                              label={
                                matchbox.matchType === 'perfect' ? 'Perfect Match' :
                                matchbox.matchType === 'no-match' ? 'No Match' : 'Verkauft'
                              }
                              color={
                                matchbox.matchType === 'perfect' ? 'success' :
                                matchbox.matchType === 'sold' ? 'info' : 'error'
                              }
                              size="small"
                            />
                            {matchbox.matchType === 'sold' && matchbox.price != null && typeof matchbox.price === 'number' && (
                              <Chip 
                                label={`${matchbox.price >= 0 ? '+' : ''}${matchbox.price.toLocaleString('de-DE')} €`}
                                color={matchbox.price >= 0 ? 'success' : 'error'}
                                size="small"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Box>
                        <Tooltip title="Bearbeiten">
                          <IconButton onClick={() => startEditing(matchbox)} color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Löschen">
                          <IconButton onClick={() => deleteMatchbox(matchbox.id!)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    {matchbox.matchType === 'sold' && matchbox.buyer && (
                      <Typography variant="body2" color="text.secondary">
                        Käufer: {matchbox.buyer}
                      </Typography>
                    )}
                    
                    {matchbox.ausstrahlungsdatum && (
                      <Typography variant="caption" color="text.secondary">
                        Ausstrahlung: {new Date(matchbox.ausstrahlungsdatum).toLocaleDateString('de-DE')}
                        {matchbox.ausstrahlungszeit && ` um ${matchbox.ausstrahlungszeit} Uhr`}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onClose={resetForm} maxWidth="md" fullWidth fullScreen={isMobileDialog}>
        <DialogTitle>
          {editingMatchbox ? 'Matchbox bearbeiten' : 'Neue Matchbox'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2
            }}>
              <FormControl fullWidth>
                <InputLabel>Frau</InputLabel>
                <Select
                  value={matchboxForm.woman}
                  label="Frau"
                  onChange={(e) => setMatchboxForm({...matchboxForm, woman: e.target.value})}
                >
                  {availableWomen.map(woman => {
                    const hasPhoto = woman.photoUrl && woman.photoUrl.trim() !== ''
                    return (
                      <MenuItem key={woman.id} value={woman.name || ''}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={hasPhoto ? woman.photoUrl : undefined}
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: hasPhoto ? undefined : 'secondary.main',
                              fontSize: '0.875rem'
                            }}
                          >
                            {!hasPhoto && (woman.name?.charAt(0) || '?')}
                          </Avatar>
                          <Typography variant="body2" component="span">{woman.name || 'Unbekannt'}</Typography>
                        </Box>
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Mann</InputLabel>
                <Select
                  value={matchboxForm.man}
                  label="Mann"
                  onChange={(e) => setMatchboxForm({...matchboxForm, man: e.target.value})}
                >
                  {availableMen.map(man => {
                    const hasPhoto = man.photoUrl && man.photoUrl.trim() !== ''
                    return (
                      <MenuItem key={man.id} value={man.name || ''}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={hasPhoto ? man.photoUrl : undefined}
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: hasPhoto ? undefined : 'primary.main',
                              fontSize: '0.875rem'
                            }}
                          >
                            {!hasPhoto && (man.name?.charAt(0) || '?')}
                          </Avatar>
                          <Typography variant="body2" component="span">{man.name || 'Unbekannt'}</Typography>
                        </Box>
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Match-Typ</InputLabel>
                <Select
                  value={matchboxForm.matchType}
                  label="Match-Typ"
                  onChange={(e) => setMatchboxForm({...matchboxForm, matchType: e.target.value as 'perfect' | 'no-match' | 'sold'})}
                >
                  <MenuItem value="perfect">Perfect Match</MenuItem>
                  <MenuItem value="no-match">No Match</MenuItem>
                  <MenuItem value="sold">Verkauft</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Alert severity="info" icon={<ScheduleIcon />}>
              Die Ausstrahlungszeiten werden zentral über den <strong>Ausstrahlungsplan</strong> verwaltet.
            </Alert>

            {matchboxForm.matchType === 'perfect' && doppelmatchAvailable && (
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={matchboxForm.isDoppelmatch === true}
                      onChange={(e) => setMatchboxForm({
                        ...matchboxForm,
                        isDoppelmatch: e.target.checked,
                        doppelmatchPartner: e.target.checked ? matchboxForm.doppelmatchPartner : undefined
                      })}
                    />
                  }
                  label="Doppelmatch (zweite Perfect-Match-Partner*in)"
                />
                {matchboxForm.isDoppelmatch && (
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Zweite Partner*in</InputLabel>
                    <Select
                      value={matchboxForm.doppelmatchPartner || ''}
                      label="Zweite Partner*in"
                      onChange={(e) => setMatchboxForm({...matchboxForm, doppelmatchPartner: e.target.value})}
                    >
                      {doppelmatchCandidates.map(person => (
                        <MenuItem key={person.id} value={person.name || ''}>
                          {person.name || 'Unbekannt'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}

            {matchboxForm.matchType === 'sold' && (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2
              }}>
                <TextField
                  fullWidth
                  label="Betrag (€)"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={matchboxForm.price ?? ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setMatchboxForm({...matchboxForm, price: isNaN(value) ? undefined : value})
                  }}
                  placeholder="0.00 (Plus = Einnahme, Minus = Ausgabe)"
                  helperText="Plus = zum Budget hinzu, Minus = vom Budget ab"
                />

                <FormControl fullWidth>
                  <InputLabel>Käufer</InputLabel>
                  <Select
                    value={matchboxForm.buyer || ''}
                    label="Käufer"
                    onChange={(e) => setMatchboxForm({...matchboxForm, buyer: e.target.value})}
                  >
                    {[...women, ...men]
                      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'))
                      .map(participant => {
                        const hasPhoto = participant.photoUrl && participant.photoUrl.trim() !== ''
                        return (
                          <MenuItem key={participant.id} value={participant.name || ''}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                src={hasPhoto ? participant.photoUrl : undefined}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: hasPhoto ? undefined : (participant.gender === 'F' ? 'secondary.main' : 'primary.main'),
                                  fontSize: '0.875rem'
                                }}
                              >
                                {!hasPhoto && (participant.name?.charAt(0) || '?')}
                              </Avatar>
                              <Typography variant="body2" component="span">
                                {participant.name || 'Unbekannt'} ({participant.gender === 'F' ? 'F' : 'M'})
                              </Typography>
                            </Box>
                          </MenuItem>
                        )
                      })
                    }
                  </Select>
                </FormControl>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1, p: { xs: 2, sm: 1.5 } }}>
          <Button onClick={resetForm}>Abbrechen</Button>
          <Button onClick={saveMatchbox} variant="contained" startIcon={<SaveIcon />}>
            {editingMatchbox ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// ** Matching Night Management Component
const MatchingNightManagement: React.FC<{
  participants: Participant[]
  matchboxes: Matchbox[]
  matchingNights: MatchingNight[]
  onUpdate: () => void
}> = ({ participants, matchboxes, matchingNights, onUpdate }) => {
  const theme = useTheme()
  const isMobileDialog = useMediaQuery(theme.breakpoints.down('sm'))
  const [editingMatchingNight, setEditingMatchingNight] = useState<MatchingNight | undefined>(undefined)
  const [isCreatingMatchingNight, setIsCreatingMatchingNight] = useState(false)
  const [matchingNightForm, setMatchingNightForm] = useState<{
    name: string;
    totalLights: number;
    pairs: Array<{woman: string, man: string}>;
    matchType: 'normal' | 'sold';
    price: number;
    buyer: string;
  }>({
    name: '',
    totalLights: 0,
    pairs: [],
    matchType: 'normal',
    price: 0,
    buyer: ''
  })
  const [selectedWoman, setSelectedWoman] = useState<string>('')
  const [selectedMan, setSelectedMan] = useState<string>('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Perfect Match Logik - nur Matchboxes die VOR der aktuellen Matching Night ausgestrahlt wurden
  const getValidPerfectMatches = (matchingNight?: MatchingNight) => {
    if (!matchingNight || !matchingNight.ausstrahlungsdatum) {
      // Wenn keine Matching Night ausgewählt ist, nur Perfect Matches mit Ausstrahlungsdaten anzeigen
      return matchboxes
        .filter(mb => mb.matchType === 'perfect' && mb.ausstrahlungsdatum && mb.ausstrahlungszeit)
        .map(mb => ({ woman: mb.woman, man: mb.man }))
    }
    
    return getValidPerfectMatchesForMatchingNight(matchboxes, matchingNight)
  }
  
  // Für die Lichter-Berechnung: Verwende die aktuell bearbeitete Matching Night
  const currentMatchingNight: MatchingNight = editingMatchingNight || {
    id: 0,
    seasonId: 0,
    name: 'temp',
    date: new Date().toISOString().split('T')[0],
    pairs: [],
    createdAt: new Date()
  }
  
  const perfectMatchPairs = getValidPerfectMatches(currentMatchingNight)

  const women = participants.filter(p => p.gender === 'F')
  const men = participants.filter(p => p.gender === 'M')

  // Used participants in current form
  const usedWomen = [
    ...matchingNightForm.pairs.map(pair => pair.woman),
    ...perfectMatchPairs.map(pair => pair.woman)
  ]
  const usedMen = [
    ...matchingNightForm.pairs.map(pair => pair.man),
    ...perfectMatchPairs.map(pair => pair.man)
  ]

  // Lichter-Berechnungen - berücksichtigt chronologische Reihenfolge
  // Hinweis: automatische Lichter werden nicht separat angezeigt; Logik bleibt in totalPerfectMatches enthalten
  
  // Perfect Matches: Gesamtanzahl aller bis dahin bekannten Perfect Matches
  const totalPerfectMatches = perfectMatchPairs.length
  
  // Andere Paare: Gesamtlichter minus alle bekannten Perfect Matches
  const manualLights = Math.max(0, matchingNightForm.totalLights - totalPerfectMatches)

  const resetForm = () => {
    setMatchingNightForm({
      name: '',
      totalLights: 0,
      pairs: [],
      matchType: 'normal',
      price: 0,
      buyer: ''
    })
    setSelectedWoman('')
    setSelectedMan('')
    setEditingMatchingNight(undefined)
    setIsCreatingMatchingNight(false)
  }

  const startCreating = () => {
    resetForm()
    setIsCreatingMatchingNight(true)
  }

  const startEditing = (matchingNight: MatchingNight) => {
    setEditingMatchingNight(matchingNight)
    setMatchingNightForm({
      name: matchingNight.name,
      totalLights: matchingNight.totalLights ?? 0,
      pairs: [...matchingNight.pairs],
      matchType: matchingNight.matchType === 'sold' ? 'sold' : 'normal',
      price: matchingNight.price ?? 0,
      buyer: matchingNight.buyer ?? ''
    })
  }

  const addPair = () => {
    if (selectedWoman && selectedMan) {
      setMatchingNightForm({
        ...matchingNightForm,
        pairs: [...matchingNightForm.pairs, { woman: selectedWoman, man: selectedMan }]
      })
      setSelectedWoman('')
      setSelectedMan('')
    }
  }

  const removePair = (index: number) => {
    setMatchingNightForm({
      ...matchingNightForm,
      pairs: matchingNightForm.pairs.filter((_, i) => i !== index)
    })
  }


  const saveMatchingNight = async () => {
    try {
      const isSold = matchingNightForm.matchType === 'sold'
      const completePairs = matchingNightForm.pairs.filter(pair => pair && pair.woman && pair.man)

      // Gemeinsame Validierung mit der Übersicht (ODI-274)
      const validationError = MatchingNightService.validateMatchingNightForm(matchingNightForm, participants, matchboxes)
      if (validationError) {
        setSnackbar({ open: true, message: validationError, severity: 'error' })
        return
      }

      if (editingMatchingNight) {
        // Verwende den MatchingNightService, damit die Season-Zugehörigkeits-Prüfung greift
        await MatchingNightService.updateMatchingNight(editingMatchingNight.id!, {
          name: matchingNightForm.name,
          totalLights: isSold ? undefined : matchingNightForm.totalLights,
          pairs: matchingNightForm.pairs,
          matchType: isSold ? 'sold' : 'normal',
          ...(isSold ? { price: matchingNightForm.price, buyer: matchingNightForm.buyer } : { price: undefined, buyer: undefined })
        })
        setSnackbar({ open: true, message: 'Matching Night wurde erfolgreich aktualisiert!', severity: 'success' })
      } else {
        const nameToUse = matchingNightForm.name?.trim() || `Matching Night #${matchingNights.length + 1}`
        await MatchingNightService.createMatchingNight({
          name: nameToUse,
          date: new Date().toISOString().split('T')[0],
          totalLights: isSold ? undefined : matchingNightForm.totalLights,
          pairs: completePairs,
          matchType: isSold ? 'sold' : 'normal',
          ...(isSold ? { price: matchingNightForm.price, buyer: matchingNightForm.buyer } : {})
        })
        setSnackbar({ open: true, message: 'Matching Night wurde erfolgreich erstellt!', severity: 'success' })
      }

      resetForm()
      onUpdate()
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      setSnackbar({ open: true, message: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }

    const deleteMatchingNight = async (id: number) => {
      try {
        // Verwende den MatchingNightService, damit die Season-Zugehörigkeits-Prüfung greift
        await MatchingNightService.deleteMatchingNight(id)

        onUpdate()
        setSnackbar({ open: true, message: 'Matching Night wurde erfolgreich gelöscht!', severity: 'success' })
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }


  return (
    <Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {editingMatchingNight || isCreatingMatchingNight ? (
          <Button variant="outlined" onClick={resetForm}>
            Bearbeitung abbrechen
          </Button>
        ) : (
          <Button variant="contained" startIcon={<AddIcon />} onClick={startCreating}>
            Neue Matching Night
          </Button>
        )}
      </Box>

      {/* Matching Nights List */}
      <Card>
        <CardHeader 
          title={`Matching Nights (${matchingNights.length})`}
          avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><NightlifeIcon sx={{ color: 'white' }} /></Avatar>}
        />
        <CardContent>
          {matchingNights.length === 0 ? (
            <Alert severity="info">Noch keine Matching Nights vorhanden</Alert>
          ) : (
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2
            }}>
              {matchingNights
                .sort((a, b) => {
                  const dateA = a.ausstrahlungsdatum ? new Date(a.ausstrahlungsdatum).getTime() : 0
                  const dateB = b.ausstrahlungsdatum ? new Date(b.ausstrahlungsdatum).getTime() : 0
                  return dateB - dateA
                })
                .map((matchingNight) => (
                <Card key={matchingNight.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'pink.main' }}>
                          <FavoriteIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {matchingNight.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Chip 
                              label={`${matchingNight.pairs.length} Paare`}
                              color="primary"
                              size="small"
                              icon={<GroupsIcon />}
                            />
                            {matchingNight.matchType === 'sold' ? (
                              <>
                                <Chip label="Verkauft" color="info" size="small" />
                                {matchingNight.price != null && typeof matchingNight.price === 'number' && (
                                  <Chip
                                    size="small"
                                    color={matchingNight.price >= 0 ? 'success' : 'error'}
                                    label={`${matchingNight.price >= 0 ? '+' : ''}${matchingNight.price.toLocaleString('de-DE')} €`}
                                  />
                                )}
                              </>
                            ) : matchingNight.totalLights !== undefined && (
                              <Chip 
                                label={`${matchingNight.totalLights} Lichter`}
                                color="warning"
                                size="small"
                                icon={<LightModeIcon />}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Box>
                        <Tooltip title="Bearbeiten">
                          <IconButton onClick={() => startEditing(matchingNight)} color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Löschen">
                          <IconButton onClick={() => deleteMatchingNight(matchingNight.id!)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    {matchingNight.matchType === 'sold' && matchingNight.buyer && (
                      <Typography variant="body2" color="text.secondary">
                        Käufer: {matchingNight.buyer}
                      </Typography>
                    )}
                    
                    {matchingNight.ausstrahlungsdatum && (
                      <Typography variant="caption" color="text.secondary">
                        Ausstrahlung: {new Date(matchingNight.ausstrahlungsdatum).toLocaleDateString('de-DE')}
                        {matchingNight.ausstrahlungszeit && ` um ${matchingNight.ausstrahlungszeit} Uhr`}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Erstellen/Bearbeiten-Dialog */}
      <Dialog open={!!editingMatchingNight || isCreatingMatchingNight} onClose={resetForm} maxWidth="lg" fullWidth fullScreen={isMobileDialog}>
        <DialogTitle>
          {editingMatchingNight ? 'Matching Night bearbeiten' : 'Neue Matching Night'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Name */}
            <TextField
              fullWidth
              label="Name"
              value={matchingNightForm.name}
              onChange={(e) => setMatchingNightForm({...matchingNightForm, name: e.target.value})}
              placeholder="z.B. Episode 1, Matching Night 1..."
            />

            {/* Match-Typ: Lichter bekannt / Verkauft */}
            <FormControl fullWidth>
              <InputLabel>Match-Typ</InputLabel>
              <Select
                value={matchingNightForm.matchType}
                label="Match-Typ"
                onChange={(e) => setMatchingNightForm({ ...matchingNightForm, matchType: e.target.value as 'normal' | 'sold' })}
              >
                <MenuItem value="normal">Lichter bekannt</MenuItem>
                <MenuItem value="sold">Verkauft</MenuItem>
              </Select>
            </FormControl>

            {matchingNightForm.matchType === 'sold' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Betrag (€)"
                  type="number"
                  value={matchingNightForm.price}
                  onChange={(e) => setMatchingNightForm({ ...matchingNightForm, price: parseFloat(e.target.value) || 0 })}
                  helperText="Plus = zum Budget hinzu, Minus = vom Budget ab"
                />
                <TextField
                  fullWidth
                  label="Käufer"
                  value={matchingNightForm.buyer}
                  onChange={(e) => setMatchingNightForm({ ...matchingNightForm, buyer: e.target.value })}
                />
              </Box>
            )}

            {matchingNightForm.matchType === 'normal' && (
            <TextField
              fullWidth
              label="Gesamtlichter aus der Show"
              type="number"
              inputProps={{ min: 0, max: 11 }}
              value={matchingNightForm.totalLights}
              onChange={(e) => setMatchingNightForm({...matchingNightForm, totalLights: parseInt(e.target.value) || 0})}
              placeholder="0"
            />
            )}

            <Alert severity="info" icon={<ScheduleIcon />}>
              Die Ausstrahlungszeiten werden zentral über den <strong>Ausstrahlungsplan</strong> verwaltet.
            </Alert>

            {/* Lichter-Analyse (nur bei "Lichter bekannt") */}
            {matchingNightForm.matchType === 'normal' && matchingNightForm.totalLights > 0 && (
              <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LightModeIcon /> Lichter-Analyse
                  </Typography>
                  <Box sx={{ 
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 2
                  }}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5" color="warning.main">{matchingNightForm.totalLights}</Typography>
                        <Typography variant="caption">Gesamtlichter</Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5" color="success.main">{totalPerfectMatches}</Typography>
                        <Typography variant="caption">Perfect Matches</Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5" color="info.main">{manualLights}</Typography>
                        <Typography variant="caption">Andere Paare</Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5" color="text.secondary">{Math.max(0, 10 - matchingNightForm.pairs.length)}</Typography>
                        <Typography variant="caption">Fehlende Paare</Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  {totalPerfectMatches > matchingNightForm.totalLights && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Achtung: Mehr bekannte Perfect Matches ({totalPerfectMatches}) als Gesamtlichter ({matchingNightForm.totalLights})!
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Paar hinzufügen */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Paar hinzufügen</Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 120px' },
                  gap: 2,
                  alignItems: 'end'
                }}>
                  <FormControl fullWidth>
                    <InputLabel>Frau</InputLabel>
                    <Select
                      value={selectedWoman}
                      label="Frau"
                      onChange={(e) => setSelectedWoman(e.target.value)}
                    >
                      {women.map(woman => {
                        const hasPhoto = woman.photoUrl && woman.photoUrl.trim() !== ''
                        return (
                          <MenuItem 
                            key={woman.id} 
                            value={woman.name || ''}
                            disabled={usedWomen.includes(woman.name || '')}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                src={hasPhoto ? woman.photoUrl : undefined}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: hasPhoto ? undefined : 'secondary.main',
                                  fontSize: '0.875rem'
                                }}
                              >
                                {!hasPhoto && (woman.name?.charAt(0) || '?')}
                              </Avatar>
                              <Typography variant="body2" component="span">
                                {woman.name || 'Unbekannt'} {usedWomen.includes(woman.name || '') ? '(verwendet)' : ''}
                              </Typography>
                            </Box>
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Mann</InputLabel>
                    <Select
                      value={selectedMan}
                      label="Mann"
                      onChange={(e) => setSelectedMan(e.target.value)}
                    >
                      {men.map(man => {
                        const hasPhoto = man.photoUrl && man.photoUrl.trim() !== ''
                        return (
                          <MenuItem 
                            key={man.id} 
                            value={man.name || ''}
                            disabled={usedMen.includes(man.name || '')}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                src={hasPhoto ? man.photoUrl : undefined}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: hasPhoto ? undefined : 'primary.main',
                                  fontSize: '0.875rem'
                                }}
                              >
                                {!hasPhoto && (man.name?.charAt(0) || '?')}
                              </Avatar>
                              <Typography variant="body2" component="span">
                                {man.name || 'Unbekannt'} {usedMen.includes(man.name || '') ? '(verwendet)' : ''}
                              </Typography>
                            </Box>
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>

                  <Button 
                    onClick={addPair}
                    disabled={!selectedWoman || !selectedMan}
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                  >
                    Hinzufügen
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Ausgewählte Paare */}
            {matchingNightForm.pairs.length > 0 && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Ausgewählte Paare ({matchingNightForm.pairs.length})
                  </Typography>
                  <Stack spacing={1}>
                    {matchingNightForm.pairs.map((pair, index) => {
                      const isPerfectMatch = perfectMatchPairs.some(
                        pm => pm.woman === pair.woman && pm.man === pair.man
                      )
                      
                      return (
                        <Card 
                          key={index} 
                          variant="outlined"
                          sx={{ 
                            bgcolor: isPerfectMatch ? 'success.50' : 'grey.50',
                            border: '1px solid',
                            borderColor: isPerfectMatch ? 'success.200' : 'grey.200'
                          }}
                        >
                          <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ 
                                  bgcolor: isPerfectMatch ? 'success.main' : 'pink.main',
                                  width: 32, height: 32
                                }}>
                                  {isPerfectMatch ? <AutoAwesomeIcon /> : <GroupsIcon />}
                                </Avatar>
                                <Box>
                                  <Typography 
                                    variant="body1" 
                                    sx={{ 
                                      fontWeight: 600,
                                      color: isPerfectMatch ? 'success.main' : 'inherit'
                                    }}
                                  >
                                    {pair.woman} + {pair.man}
                                  </Typography>
                                  {isPerfectMatch && (
                                    <Chip 
                                      label="Perfect Match" 
                                      color="success" 
                                      size="small" 
                                      sx={{ mt: 0.5 }}
                                    />
                                  )}
                                </Box>
                              </Box>
                              <Box>
                                {!isPerfectMatch ? (
                                  <Tooltip title="Entfernen">
                                    <IconButton 
                                      onClick={() => removePair(index)}
                                      color="error"
                                      size="small"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <Chip label="Fest gesetzt" color="success" variant="outlined" size="small" />
                                )}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1, p: { xs: 2, sm: 1.5 } }}>
          <Button onClick={resetForm}>Abbrechen</Button>
          <Button onClick={saveMatchingNight} variant="contained" startIcon={<SaveIcon />}>
            {editingMatchingNight ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// ** Settings Management Component
const SettingsManagement: React.FC<{
  participants: Participant[]
  matchboxes: Matchbox[]
  matchingNights: MatchingNight[]
  penalties: Penalty[]
  onUpdate: () => void
  renderContext?: 'settings' | 'json-import' | 'appearance'
}> = ({ participants, matchboxes, matchingNights, penalties, onUpdate, renderContext = 'settings' }) => {
  const theme = useTheme()
  const isMobileDialog = useMediaQuery(theme.breakpoints.down('sm'))
  const [isLoading, setIsLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    severity?: 'warning' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })
  const [budgetSettings, setBudgetSettings] = useState({
    startingBudget: 200000,
    showDialog: false
  })
  const [newBudget, setNewBudget] = useState<string>('')
  const [themeColorSettings, setThemeColorSettings] = useState({
    primary: DEFAULT_COLOR_PREFERENCES.primary,
    secondary: DEFAULT_COLOR_PREFERENCES.secondary
  })
  const [penaltyForm, setPenaltyForm] = useState({
    participantName: '',
    reason: '',
    amount: '',
    description: '',
    showDialog: false
  })
  const [editingPenalty, setEditingPenalty] = useState<Penalty | undefined>(undefined)

  const totalEntries = participants.length + matchingNights.length + matchboxes.length + penalties.length

  // ** Load budget settings from localStorage **
  useEffect(() => {
    const savedBudget = localStorage.getItem('ayto-starting-budget')
    if (savedBudget) {
      setBudgetSettings(prev => ({ ...prev, startingBudget: parseInt(savedBudget, 10) }))
    }
    const colors = loadColorPreferences()
    setThemeColorSettings(colors)
  }, [])

  // ** Budget Functions **
  const saveBudgetSettings = () => {
    const budget = parseInt(newBudget, 10)
    if (isNaN(budget) || budget < 0) {
      setSnackbar({ open: true, message: '❌ Bitte geben Sie eine gültige Summe ein!', severity: 'error' })
      return
    }

    setBudgetSettings(prev => ({ ...prev, startingBudget: budget, showDialog: false }))
    localStorage.setItem('ayto-starting-budget', budget.toString())
    setNewBudget('')
    setSnackbar({ open: true, message: `✅ Startsumme wurde auf ${budget.toLocaleString('de-DE')} € gesetzt!`, severity: 'success' })
  }

  const openBudgetDialog = () => {
    setNewBudget(budgetSettings.startingBudget.toString())
    setBudgetSettings(prev => ({ ...prev, showDialog: true }))
  }

  const closeBudgetDialog = () => {
    setBudgetSettings(prev => ({ ...prev, showDialog: false }))
    setNewBudget('')
  }

  const saveThemeColors = () => {
    if (!isHexColor(themeColorSettings.primary) || !isHexColor(themeColorSettings.secondary)) {
      setSnackbar({ open: true, message: '❌ Bitte gültige HEX-Farben angeben (z. B. #BF1E1E).', severity: 'error' })
      return
    }
    saveColorPreferences(themeColorSettings)
    setSnackbar({ open: true, message: '✅ Theme-Farben wurden gespeichert und direkt angewendet.', severity: 'success' })
  }

  const restoreDefaultThemeColors = () => {
    resetColorPreferences()
    setThemeColorSettings(DEFAULT_COLOR_PREFERENCES)
    setSnackbar({ open: true, message: '✅ Standardfarben wurden wiederhergestellt.', severity: 'success' })
  }

  // ** Penalty Functions **
  const openPenaltyDialog = () => {
    setPenaltyForm({
      participantName: '',
      reason: '',
      amount: '',
      description: '',
      showDialog: true
    })
    setEditingPenalty(undefined)
  }

  const openEditPenaltyDialog = (penalty: Penalty) => {
    setPenaltyForm({
      participantName: penalty.participantName,
      reason: penalty.reason,
      amount: penalty.amount.toString(),
      description: penalty.description || '',
      showDialog: true
    })
    setEditingPenalty(penalty)
  }

  const closePenaltyDialog = () => {
    setPenaltyForm({
      participantName: '',
      reason: '',
      amount: '',
      description: '',
      showDialog: false
    })
    setEditingPenalty(undefined)
  }

  const savePenalty = async () => {
    try {
      const amount = parseFloat(penaltyForm.amount)
      if (!penaltyForm.participantName || !penaltyForm.reason || isNaN(amount) || amount === 0) {
        setSnackbar({ open: true, message: '❌ Bitte füllen Sie alle Pflichtfelder aus und geben Sie einen Betrag ≠ 0 ein!', severity: 'error' })
        return
      }

      if (editingPenalty) {
        // Verwende den PenaltyService, damit die Season-Zugehörigkeits-Prüfung greift
        await PenaltyService.updatePenalty(editingPenalty.id!, {
          participantName: penaltyForm.participantName,
          reason: penaltyForm.reason,
          amount: amount,
          description: penaltyForm.description,
          date: new Date().toISOString().split('T')[0]
        })

        setSnackbar({ open: true, message: '✅ Transaktion wurde erfolgreich aktualisiert!', severity: 'success' })
      } else {
        // Verwende den PenaltyService für das Hinzufügen
        await PenaltyService.createPenalty({
          participantName: penaltyForm.participantName,
          reason: penaltyForm.reason,
          amount: amount,
          description: penaltyForm.description,
          date: new Date().toISOString().split('T')[0]
        })

        setSnackbar({ open: true, message: '✅ Transaktion wurde erfolgreich hinzugefügt!', severity: 'success' })
      }

      closePenaltyDialog()
      await onUpdate()
    } catch (error) {
      console.error('Fehler beim Speichern der Strafe:', error)
      setSnackbar({ open: true, message: `❌ Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }

  const deletePenalty = async (id: number) => {
    setConfirmDialog({
      open: true,
      title: 'Strafe löschen',
      message: 'Wirklich diese Strafe löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden!',
      severity: 'warning',
      onConfirm: async () => {
        try {
          // Verwende den PenaltyService, damit die Season-Zugehörigkeits-Prüfung greift
          await PenaltyService.deletePenalty(id)

          await onUpdate()
          setSnackbar({ open: true, message: 'Transaktion wurde erfolgreich gelöscht!', severity: 'success' })
        } catch (error) {
          console.error('Fehler beim Löschen der Strafe:', error)
          setSnackbar({ open: true, message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
        }
      }
    })
  }

  // ** Export Functions **
  const exportParticipants = async () => {
    try {
      const data = await ParticipantService.getAllParticipants()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `participants-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSnackbar({ open: true, message: `✅ ${data.length} Kandidat*innen wurden exportiert!`, severity: 'success' })
    } catch (error) {
      console.error('Fehler beim Export der Kandidat*innen:', error)
      setSnackbar({ open: true, message: `❌ Fehler beim Export: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }

  const exportMatchingNights = async () => {
    try {
      const data = await MatchingNightService.getAllMatchingNights()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `matching-nights-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSnackbar({ open: true, message: `✅ ${data.length} Matching Nights wurden exportiert!`, severity: 'success' })
    } catch (error) {
      console.error('Fehler beim Export der Matching Nights:', error)
      setSnackbar({ open: true, message: `❌ Fehler beim Export: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }

  const exportMatchboxes = async () => {
    try {
      const data = await MatchboxService.getAllMatchboxes()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `matchboxes-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSnackbar({ open: true, message: `✅ ${data.length} Matchboxes wurden exportiert!`, severity: 'success' })
    } catch (error) {
      console.error('Fehler beim Export der Matchboxes:', error)
      setSnackbar({ open: true, message: `❌ Fehler beim Export: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }

  const exportPenalties = async () => {
    try {
      const data = await PenaltyService.getAllPenalties()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `penalties-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSnackbar({ open: true, message: `✅ ${data.length} Strafen/Transaktionen wurden exportiert!`, severity: 'success' })
    } catch (error) {
      console.error('Fehler beim Export der Strafen:', error)
      setSnackbar({ open: true, message: `❌ Fehler beim Export: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
    }
  }

  const exportForDeploy = async () => {
    try {
      setIsLoading(true)

      const exportInput = await DatabaseUtils.exportData()
      const result = buildDeploymentExport({
        ...exportInput,
        // Version: Git-Tag falls vorhanden, sonst Package-Version aus VERSION_INFO
        version: VERSION_INFO.gitTag ?? VERSION_INFO.version
      })

      if (!result.success) {
        setSnackbar({
          open: true,
          message: `❌ Export abgebrochen: Es fehlen Ausstrahlungsdaten bei ${result.invalidMatchingNightsCount} Matching Night(s) und ${result.invalidMatchboxesCount} Matchbox(es).\nBitte Ausstrahlungsplan im Admin-Panel vervollständigen und erneut exportieren.`,
          severity: 'error'
        })
        setIsLoading(false)
        return
      }

      const { data, fileName } = result

      // JSON-String erstellen
      const jsonString = JSON.stringify(data, null, 2)

      // Blob erstellen und Download auslösen
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      // Index.json aktualisieren (simuliert)
      await updateIndexJsonForDeploy(fileName)

      const totalItems = data.participants.length + data.matchingNights.length + data.matchboxes.length + data.penalties.length + data.broadcastNotes.length

      setSnackbar({
        open: true,
        message: `✅ Datenbankstand für Deployment exportiert!\n\n📁 Datei: ${fileName}\n📊 ${data.participants.length} Kandidat*innen, ${data.matchingNights.length} Matching Nights, ${data.matchboxes.length} Matchboxes, ${data.penalties.length} Strafen, ${data.broadcastNotes.length} Notizen\n📈 Gesamt: ${totalItems} Einträge\n\n💡 Diese Datei muss in public/json/ gespeichert und deployed werden.`,
        severity: 'success'
      })

    } catch (error) {
      console.error('Fehler beim Export für Deploy:', error)
      setSnackbar({ 
        open: true, 
        message: `❌ Fehler beim Export für Deploy: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 
        severity: 'error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Hilfsfunktion zum Aktualisieren der index.json für Deployment
  const updateIndexJsonForDeploy = async (fileName: string) => {
    try {
      // Lade aktuelle index.json
      const response = await fetch('/json/index.json')
      let currentFiles: string[] = []
      
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          currentFiles = data
        }
      }
      
      // Neue Datei hinzufügen, falls nicht bereits vorhanden
      if (!currentFiles.includes(fileName)) {
        currentFiles.unshift(fileName) // An den Anfang der Liste setzen
        
        // Nur die neuesten 10 Dateien behalten
        currentFiles = currentFiles.slice(0, 10)
        
        console.log(`📝 Index.json würde aktualisiert werden mit:`, currentFiles)
        console.log(`ℹ️ Für das Deployment muss diese Datei manuell in public/json/index.json gespeichert werden`)
      }
    } catch (error) {
      console.warn('⚠️ Konnte index.json nicht aktualisieren:', error)
    }
  }

  // ** Delete Functions **
  const deleteParticipants = async () => {
    setConfirmDialog({
      open: true,
      title: 'Alle Kandidat*innen löschen',
      message: `Wirklich alle ${participants.length} Kandidat*innen löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`,
      severity: 'warning',
      onConfirm: async () => {
        try {
          setIsLoading(true)
          await ParticipantService.deleteAllForActiveSeason()
          await onUpdate()
          setSnackbar({ open: true, message: 'Alle Kandidat*innen wurden erfolgreich gelöscht!', severity: 'success' })
        } catch (error) {
          console.error('Fehler beim Löschen der Kandidat*innen:', error)
          setSnackbar({ open: true, message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  const deleteMatchingNights = async () => {
    setConfirmDialog({
      open: true,
      title: 'Alle Matching Nights löschen',
      message: `Wirklich alle ${matchingNights.length} Matching Nights löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`,
      severity: 'warning',
      onConfirm: async () => {
        try {
          setIsLoading(true)
          await MatchingNightService.deleteAllForActiveSeason()
          await onUpdate()
          setSnackbar({ open: true, message: 'Alle Matching Nights wurden erfolgreich gelöscht!', severity: 'success' })
        } catch (error) {
          console.error('Fehler beim Löschen der Matching Nights:', error)
          setSnackbar({ open: true, message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  const deleteMatchboxes = async () => {
    setConfirmDialog({
      open: true,
      title: 'Alle Matchboxes löschen',
      message: `Wirklich alle ${matchboxes.length} Matchboxes löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`,
      severity: 'warning',
      onConfirm: async () => {
        try {
          setIsLoading(true)
          await MatchboxService.deleteAllForActiveSeason()
          await onUpdate()
          setSnackbar({ open: true, message: 'Alle Matchboxes wurden erfolgreich gelöscht!', severity: 'success' })
        } catch (error) {
          console.error('Fehler beim Löschen der Matchboxes:', error)
          setSnackbar({ open: true, message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  const fixSwappedMatchingNights = async () => {
    setConfirmDialog({
      open: true,
      title: '🔧 Matching Nights korrigieren',
      message: 'Vertauschte Mann/Frau-Zuordnungen in Matching Nights korrigieren?\n\nDies analysiert alle Matching Nights und korrigiert automatisch fehlerhafte Zuordnungen.',
      severity: 'warning',
      onConfirm: async () => {
        try {
          setIsLoading(true)
          console.log('🔧 Starte Matching Nights Korrektur...')
          
          const [allParticipants, allMatchingNights] = await Promise.all([
            ParticipantService.getAllParticipants(),
            MatchingNightService.getAllMatchingNights()
          ])
          
          // Extrahiere Männer- und Frauen-Listen
          const menNames = allParticipants.filter(p => p.gender === 'M').map(p => p.name)
          const womenNames = allParticipants.filter(p => p.gender === 'F').map(p => p.name)
          
          console.log('👥 Kandidat*innen:', { männer: menNames.length, frauen: womenNames.length })
          
          let correctedCount = 0
          
          // Prüfe jede Matching Night
          for (const night of allMatchingNights) {
            const menInNight = new Set(night.pairs.map(p => p.man))
            
            // Prüfe ob die Mehrheit der "Männer" tatsächlich Frauen sind
            const menNamesInMenField = Array.from(menInNight).filter(name => menNames.includes(name))
            const womenNamesInMenField = Array.from(menInNight).filter(name => womenNames.includes(name))
            
            const isSwapped = womenNamesInMenField.length > menNamesInMenField.length
            
            if (isSwapped) {
              console.warn(`⚠️ Matching Night "${night.name}" (ID: ${night.id}): Paare sind vertauscht!`)
              
              // Korrigiere die Paare
              const correctedPairs = night.pairs.map(pair => ({
                woman: pair.man, // Vertausche
                man: pair.woman  // Vertausche
              }))
              
              // Speichere in der Datenbank
              await MatchingNightService.updateMatchingNight(night.id!, { pairs: correctedPairs })
              
              console.log(`✅ Matching Night "${night.name}" korrigiert!`)
              correctedCount++
            }
          }
          
          console.log(`✅ Korrektur abgeschlossen: ${correctedCount} Matching Night(s) korrigiert`)
          
          // Zeige Erfolgsmeldung
          if (correctedCount > 0) {
            alert(`✅ ${correctedCount} Matching Night(s) erfolgreich korrigiert!\n\nDie Seite wird neu geladen.`)
            // Seite neu laden, um alle Daten zu aktualisieren
            window.location.reload()
          } else {
            alert('✅ Keine fehlerhaften Matching Nights gefunden - alles korrekt!')
            setIsLoading(false)
          }
          
        } catch (error) {
          console.error('Fehler bei der Matching Night Korrektur:', error)
          alert(`❌ Fehler bei der Korrektur: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
          setIsLoading(false)
        }
      }
    })
  }

  const fixTimestamps = async () => {
    setConfirmDialog({
      open: true,
      title: '📅 Zeitstempel korrigieren',
      message: 'Möchtest du die Ausstrahlungszeiten setzen?\n\nMatchbox: 20:15 Uhr (zuerst)\nMatching Night: 21:00 Uhr (danach)\n\n(Nur Uhrzeiten, Daten bleiben unverändert)',
      severity: 'warning',
      onConfirm: async () => {
        try {
          setIsLoading(true)
          console.log('📅 Starte Zeitstempel-Korrektur...')
          
          const [allMatchingNights, allMatchboxes] = await Promise.all([
            MatchingNightService.getAllMatchingNights(),
            MatchboxService.getAllMatchboxes()
          ])
          
          let nightsUpdated = 0
          let boxesUpdated = 0
          
          // Update Matching Nights - setze nur die Uhrzeit auf 21:00
          console.log('📅 Aktualisiere Matching Nights...')
          for (const night of allMatchingNights) {
            if (!night.id) continue
            
            await MatchingNightService.updateMatchingNight(night.id, {
              ausstrahlungszeit: '21:00'
            })
            
            console.log(`  ✅ ${night.name}: 21:00`)
            nightsUpdated++
          }
          
          // Update Matchboxes - setze nur die Uhrzeit auf 20:15
          console.log('📦 Aktualisiere Matchboxes...')
          for (const box of allMatchboxes) {
            if (!box.id) continue
            
            await MatchboxService.updateMatchbox(box.id, {
              ausstrahlungszeit: '20:15'
            })
            
            console.log(`  ✅ Matchbox ${box.woman} & ${box.man}: 20:15`)
            boxesUpdated++
          }
          
          console.log(`✅ Zeitstempel-Korrektur abgeschlossen: ${nightsUpdated} Matching Nights und ${boxesUpdated} Matchboxes aktualisiert`)
          
          alert(`✅ Zeitstempel erfolgreich korrigiert!\n\n${boxesUpdated} Matchboxes (20:15)\n${nightsUpdated} Matching Nights (21:00)\n\nDie Seite wird neu geladen.`)
          window.location.reload()
          
        } catch (error) {
          console.error('Fehler bei der Zeitstempel-Korrektur:', error)
          alert(`❌ Fehler bei der Korrektur: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
          setIsLoading(false)
        }
      }
    })
  }

  const clearCache = async () => {
    setConfirmDialog({
      open: true,
      title: '🗑️ Kompletter Browser-Reset',
      message: 'Browser-Cache, Cookies und alle gespeicherten Daten löschen?\n\nDies setzt die Seite komplett zurück und kann bei Problemen helfen.\n\nDie Datenbank bleibt unverändert.',
      severity: 'warning',
      onConfirm: async () => {
        try {
          setIsLoading(true)
          
          // Service Worker Cache löschen
          if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            )
          }
          
          // Local Storage löschen (außer Datenbank und der selbst erarbeiteten Lösung)
          const keysToKeep = ['dexie-database-version', 'dexie-database-schema', 'userSolution']
          const allKeys = Object.keys(localStorage)
          allKeys.forEach(key => {
            if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
              localStorage.removeItem(key)
            }
          })
          
          // Session Storage löschen
          sessionStorage.clear()
          
          // Cookies löschen
          if (document.cookie) {
            // Alle Cookies für die aktuelle Domain löschen
            const cookies = document.cookie.split(';')
            cookies.forEach(cookie => {
              const eqPos = cookie.indexOf('=')
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
              if (name) {
                // Cookie für verschiedene Pfade und Domains löschen
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure`
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;samesite=strict`
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;samesite=lax`
              }
            })
          }
          
          // IndexedDB Cache löschen (nur Cache, nicht die Daten)
          if ('indexedDB' in window) {
            try {
              // Versuche IndexedDB zu leeren (nur Cache-Tabellen)
              const databases = await indexedDB.databases()
              for (const database of databases) {
                if (database.name && database.name.includes('cache')) {
                  const deleteReq = indexedDB.deleteDatabase(database.name)
                  await new Promise((resolve, reject) => {
                    deleteReq.onsuccess = () => resolve(true)
                    deleteReq.onerror = () => reject(deleteReq.error)
                  })
                }
              }
            } catch (error) {
              console.log('IndexedDB Cache-Löschung übersprungen:', error)
            }
          }
          
          // Web Storage API erweitert löschen
          try {
            // Clear all storage types
            if ('storage' in navigator && 'estimate' in navigator.storage) {
              // Quota-Informationen löschen
              await navigator.storage.persist()
            }
          } catch (error) {
            console.log('Storage API Löschung übersprungen:', error)
          }
          
          setSnackbar({ open: true, message: '✅ Browser wurde komplett zurückgesetzt! Cache, Cookies und alle Daten wurden gelöscht. Die Seite wird neu geladen.', severity: 'success' })
          
          // Seite nach kurzer Verzögerung neu laden
          setTimeout(() => {
            window.location.reload()
          }, 2000)
          
        } catch (error) {
          console.error('Fehler beim Löschen des Caches:', error)
          setSnackbar({ open: true, message: `❌ Fehler beim Browser-Reset: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  const resetCompleteDatabase = async () => {
    // Erste Bestätigung
    const firstConfirm = window.confirm(`⚠️ KOMPLETTER DATENBANK-RESET ⚠️

Diese Aktion wird ALLE Daten unwiderruflich löschen:

• ${participants.length} Kandidat*innen
• ${matchingNights.length} Matching Nights
• ${matchboxes.length} Matchboxes
• ${penalties.length} Strafen/Transaktionen
• Gesamt: ${totalEntries} Einträge

Dieser Vorgang kann NICHT rückgängig gemacht werden!

Sind Sie sich absolut sicher?`)

    if (!firstConfirm) return

    // Zweite Bestätigung
    const secondConfirm = window.confirm(`LETZTE WARNUNG!

Wirklich die KOMPLETTE Datenbank löschen?

Alle Daten gehen unwiderruflich verloren!`)

    if (!secondConfirm) return

    try {
      setIsLoading(true)
      console.log('Starte kompletten Datenbank-Reset...')
      
      await DatabaseUtils.clearAll()
      
      console.log('Datenbank erfolgreich geleert, lade Daten neu...')
      await onUpdate()
      
      setSnackbar({ 
        open: true, 
        message: '✅ Datenbank wurde komplett zurückgesetzt! Alle Daten wurden erfolgreich gelöscht.', 
        severity: 'success' 
      })
      
      console.log('Datenbank-Reset abgeschlossen')
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Datenbank:', error)
      setSnackbar({ 
        open: true, 
        message: `❌ Fehler beim Zurücksetzen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 
        severity: 'error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // entfernt: Testdaten-Funktion

  // ** Import Functions **
  const importParticipantsJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setIsLoading(true)
      const text = await file.text()
      const arr = JSON.parse(text) as LegacyParticipantJSON[]
      const seasonId = await getActiveSeasonId()

      // Daten normalisieren und Gender-Mapping durchführen
      const normalizedParticipants = arr.map((participant) => {
        // Gender-Mapping: w/m -> F/M
        let gender = participant.gender
        if (gender === 'w' || gender === 'weiblich' || gender === 'female') {
          gender = 'F'
        } else if (gender === 'm' || gender === 'männlich' || gender === 'male') {
          gender = 'M'
        }
        
        // Sicherstellen, dass alle erforderlichen Felder vorhanden sind
        return {
          seasonId,
          name: participant.name || 'Unbekannt',
          knownFrom: participant.knownFrom || '',
          age: participant.age ? parseInt(participant.age.toString(), 10) : undefined,
          status: (participant.status || 'Aktiv') as Participant['status'],
          active: participant.active !== false, // Default: aktiv
          photoUrl: participant.photoUrl || '',
          bio: participant.bio || '',
          gender: (gender || 'F') as Participant['gender'], // Default: weiblich falls unbekannt
        }
      })
      
      setConfirmDialog({
        open: true,
        title: 'JSON Import bestätigen',
        message: `${normalizedParticipants.length} Kandidat*innen aus JSON importieren?\n\nDies ersetzt alle bestehenden Kandidat*innen!`,
        severity: 'warning',
        onConfirm: async () => {
          try {
            await ParticipantService.replaceAllForActiveSeason(normalizedParticipants)

            await onUpdate()
            setSnackbar({ open: true, message: `✅ Import erfolgreich! ${normalizedParticipants.length} Kandidat*innen wurden importiert.`, severity: 'success' })
          } catch (error) {
            console.error('Fehler beim Import:', error)
            setSnackbar({ open: true, message: `❌ Fehler beim Import: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
          }
        }
      })
    } catch (error) {
      console.error('Fehler beim Import:', error)
      setSnackbar({ open: true, message: `❌ Fehler beim Import: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n\nBitte überprüfen Sie die JSON-Datei.`, severity: 'error' })
    } finally {
      setIsLoading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const importCompleteData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setIsLoading(true)
      const text = await file.text()
      const data = JSON.parse(text) as LegacyBackupJSON

      // Validiere das Format
      if (!data.participants || !data.matchingNights || !data.matchboxes) {
        throw new Error('Ungültiges Backup-Format. Fehlende Tabellen.')
      }
      
      setConfirmDialog({
        open: true,
        title: 'Komplettdaten importieren',
        message: `Alle Daten aus Backup importieren?\n\n${data.participants.length} Kandidat*innen\n${data.matchingNights.length} Matching Nights\n${data.matchboxes.length} Matchboxes\n${data.penalties?.length || 0} Strafen/Transaktionen\n\n⚠️ Dies ersetzt ALLE bestehenden Daten!`,
        severity: 'warning',
        onConfirm: async () => {
          try {
            const seasonId = await getActiveSeasonId()
            await assertSeasonWritable(seasonId)
            await clearAllDataForSeason(seasonId)

            const transformedParticipants = data.participants.map((p) => ({ ...p, seasonId }))
            const transformedMatchingNights = data.matchingNights.map((matchingNight) => ({
              ...matchingNight,
              seasonId,
              createdAt: matchingNight.createdAt ? new Date(matchingNight.createdAt) : new Date()
            }))
            const transformedMatchboxes = data.matchboxes.map((matchbox) => ({
              ...matchbox,
              seasonId,
              woman: matchbox.womanId || matchbox.woman,
              man: matchbox.manId || matchbox.man,
              womanId: undefined,
              manId: undefined,
              createdAt: matchbox.createdAt ? new Date(matchbox.createdAt) : new Date(),
              updatedAt: matchbox.updatedAt ? new Date(matchbox.updatedAt) : new Date()
            }))
            const transformedPenalties = (data.penalties || []).map((penalty) => ({
              ...penalty,
              seasonId,
              createdAt: penalty.createdAt ? new Date(penalty.createdAt) : new Date()
            }))

            // Backup stammt aus unserem eigenen Export (exportForDeploy) und wird hier vertraut übernommen.
            await DatabaseUtils.importData({
              participants: transformedParticipants as Participant[],
              matchingNights: transformedMatchingNights as MatchingNight[],
              matchboxes: transformedMatchboxes as Matchbox[],
              penalties: transformedPenalties as Penalty[]
            })

            await onUpdate()
            const totalImported = data.participants.length + data.matchingNights.length + data.matchboxes.length + (data.penalties?.length || 0)
            setSnackbar({ 
              open: true, 
              message: `✅ Kompletter Import erfolgreich!\n\n${data.participants.length} Kandidat*innen\n${data.matchingNights.length} Matching Nights\n${data.matchboxes.length} Matchboxes\n${data.penalties?.length || 0} Strafen/Transaktionen\n\nGesamt: ${totalImported} Einträge`, 
              severity: 'success' 
            })
          } catch (error) {
            console.error('Fehler beim Komplettimport:', error)
            setSnackbar({ open: true, message: `❌ Fehler beim Komplettimport: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, severity: 'error' })
          }
        }
      })
    } catch (error) {
      console.error('Fehler beim Komplettimport:', error)
      setSnackbar({ open: true, message: `❌ Fehler beim Komplettimport: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n\nBitte überprüfen Sie die Backup-Datei.`, severity: 'error' })
    } finally {
      setIsLoading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  // ** Budget Calculations ** (ODI-272)
  const soldMatchboxes = matchboxes.filter(mb => mb.matchType === 'sold' && typeof mb.price === 'number')
  const soldMatchingNights = matchingNights.filter(mn => mn.matchType === 'sold' && typeof mn.price === 'number')
  const { totalVerkauf, totalPenalties, totalCredits, currentBalance } = calculateBudget(
    matchboxes,
    matchingNights,
    penalties,
    budgetSettings.startingBudget
  )


  const exportItems = [
    { title: 'Kandidat*innen', count: participants.length, onClick: exportParticipants, icon: <PeopleIcon />, disabled: participants.length === 0 },
    { title: 'Matching Nights', count: matchingNights.length, onClick: exportMatchingNights, icon: <NightlifeIcon />, disabled: matchingNights.length === 0 },
    { title: 'Matchboxes', count: matchboxes.length, onClick: exportMatchboxes, icon: <InventoryIcon />, disabled: matchboxes.length === 0 },
    { title: 'Strafen/Transaktionen', count: penalties.length, onClick: exportPenalties, icon: <AccountBalanceWalletIcon />, disabled: penalties.length === 0 },
    { title: 'Für Deploy exportieren', count: totalEntries, onClick: exportForDeploy, icon: <CloudUploadIcon />, disabled: totalEntries === 0, variant: 'contained' as const, color: 'secondary' as const }
  ]

  const deleteItems = [
    { title: 'Kandidat*innen', count: participants.length, onClick: deleteParticipants, icon: <PeopleIcon />, disabled: participants.length === 0 },
    { title: 'Matching Nights', count: matchingNights.length, onClick: deleteMatchingNights, icon: <NightlifeIcon />, disabled: matchingNights.length === 0 },
    { title: 'Matchboxes', count: matchboxes.length, onClick: deleteMatchboxes, icon: <InventoryIcon />, disabled: matchboxes.length === 0 }
  ]

  return (
    <Box>
      {renderContext === 'appearance' && (
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title="Farben & Verläufe"
            avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}><PaletteIcon /></Avatar>}
          />
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '180px 280px 180px 280px' },
                gap: 2,
                alignItems: 'end'
              }}
            >
              <TextField
                label="Primary Picker"
                type="color"
                value={themeColorSettings.primary}
                onChange={(e) => setThemeColorSettings(prev => ({ ...prev, primary: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hauptfarbe (Männer)"
                value={themeColorSettings.primary}
                onChange={(e) => setThemeColorSettings(prev => ({ ...prev, primary: e.target.value }))}
                placeholder="#BD0A16"
                sx={{ width: 280 }}
              />
              <TextField
                label="Secondary Picker"
                type="color"
                value={themeColorSettings.secondary}
                onChange={(e) => setThemeColorSettings(prev => ({ ...prev, secondary: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Akzentfarbe (Frauen)"
                value={themeColorSettings.secondary}
                onChange={(e) => setThemeColorSettings(prev => ({ ...prev, secondary: e.target.value }))}
                placeholder="#CD9536"
                sx={{ width: 280 }}
              />
            </Box>
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                color: '#fff',
                background: `linear-gradient(135deg, ${themeColorSettings.primary} 0%, ${themeColorSettings.secondary} 100%)`
              }}
            >
              Vorschau Matchbox-Verlauf
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={saveThemeColors}>Farben speichern</Button>
              <Button variant="outlined" onClick={restoreDefaultThemeColors}>Auf Standard zurücksetzen</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Budget Settings Section (hidden in Datenhaltung) */}
      {renderContext === 'settings' && (
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Budget Einstellungen"
          avatar={<Avatar sx={{ bgcolor: 'warning.main' }}><SavingsIcon /></Avatar>}
        />
        <CardContent>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 4,
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Aktueller Kontostand
              </Typography>
              <Card variant="outlined" sx={{ 
                textAlign: 'center', 
                p: 3, 
                bgcolor: currentBalance >= 0 ? 'success.50' : 'error.50' 
              }}>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: currentBalance >= 0 ? 'success.main' : 'error.main', 
                  mb: 1 
                }}>
                  {currentBalance.toLocaleString('de-DE')} €
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentBalance >= 0 ? 'Verfügbares Budget' : 'Überzogenes Budget'}
                </Typography>
              </Card>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Budget-Details
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Startsumme:</Typography>
                  <Chip 
                    label={`${budgetSettings.startingBudget.toLocaleString('de-DE')} €`} 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>Verkäufe:</Typography>
                  {soldMatchboxes.length === 0 && soldMatchingNights.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">Keine Verkäufe</Typography>
                  ) : (
                    <Stack spacing={0.5} sx={{ mb: 1 }}>
                      {soldMatchboxes.map((mb) => (
                        <Box key={`mb-${mb.id}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                            Matchbox: {mb.woman} + {mb.man}
                            {mb.buyer ? ` (${mb.buyer})` : ''}
                          </Typography>
                          <Chip size="small" variant="outlined" color="info" label={`${(mb.price ?? 0) >= 0 ? '+' : ''}${(mb.price ?? 0).toLocaleString('de-DE')} €`} />
                        </Box>
                      ))}
                      {soldMatchingNights.map((mn) => (
                        <Box key={`mn-${mn.id}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                            Matching Night: {mn.name}
                            {mn.buyer ? ` (${mn.buyer})` : ''}
                          </Typography>
                          <Chip size="small" variant="outlined" color="info" label={`${(mn.price ?? 0) >= 0 ? '+' : ''}${(mn.price ?? 0).toLocaleString('de-DE')} €`} />
                        </Box>
                      ))}
                    </Stack>
                  )}
                  {(soldMatchboxes.length > 0 || soldMatchingNights.length > 0) && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, py: 0.5, px: 1, borderRadius: 1, bgcolor: totalVerkauf >= 0 ? 'success.50' : 'error.50' }}>
                      <Typography variant="body2" fontWeight={700}>Summe Verkäufe:</Typography>
                      <Chip size="small" variant="filled" color={totalVerkauf >= 0 ? 'success' : 'error'} label={`${totalVerkauf >= 0 ? '+' : ''}${totalVerkauf.toLocaleString('de-DE')} €`} sx={{ fontWeight: 700 }} />
                    </Box>
                  )}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>Strafen / Gutschriften:</Typography>
                  {penalties.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">Keine Einträge</Typography>
                  ) : (
                    <Stack spacing={0.5} sx={{ mb: 1 }}>
                      {penalties
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((p) => (
                        <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                            {p.participantName}: {p.reason}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={p.amount >= 0 ? 'success' : 'error'}
                            label={`${p.amount >= 0 ? '+' : ''}${p.amount.toLocaleString('de-DE')} €`}
                          />
                        </Box>
                      ))}
                    </Stack>
                  )}
                  {penalties.length > 0 && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, py: 0.5, px: 1, borderRadius: 1, bgcolor: 'error.50' }}>
                        <Typography variant="body2" fontWeight={700}>Summe Strafen:</Typography>
                        <Chip size="small" variant="filled" color="error" label={`-${totalPenalties.toLocaleString('de-DE')} €`} sx={{ fontWeight: 700 }} />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, py: 0.5, px: 1, borderRadius: 1, bgcolor: 'success.50' }}>
                        <Typography variant="body2" fontWeight={700}>Summe Gutschriften:</Typography>
                        <Chip size="small" variant="filled" color="success" label={`+${totalCredits.toLocaleString('de-DE')} €`} sx={{ fontWeight: 700 }} />
                      </Box>
                    </>
                  )}
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1, borderRadius: 1, bgcolor: currentBalance >= 0 ? 'success.50' : 'error.50' }}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>Aktueller Kontostand:</Typography>
                  <Chip 
                    variant="filled"
                    label={`${currentBalance.toLocaleString('de-DE')} €`} 
                    color={currentBalance >= 0 ? 'success' : 'error'}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={openBudgetDialog}
              disabled={isLoading}
            >
              Startsumme ändern
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>💡 Hinweis:</strong> Die Startsumme wird lokal gespeichert und beeinflusst die Berechnung des aktuellen Kontostands basierend auf verkauften Matchboxes.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
      )}

      {/* Penalties Management Section (hidden in Datenhaltung) */}
      {renderContext === 'settings' && (
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Strafen-Verwaltung"
          avatar={<Avatar sx={{ bgcolor: 'error.main' }}><WarningIcon /></Avatar>}
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openPenaltyDialog}
              disabled={isLoading}
            >
              Transaktion hinzufügen
            </Button>
          }
        />
        <CardContent>
          {penalties.length === 0 ? (
            <Alert severity="info">
              Noch keine Strafen erfasst
            </Alert>
          ) : (
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2
            }}>
              {penalties
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((penalty) => (
                <Card key={penalty.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'error.main' }}>
                          <WarningIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {penalty.participantName}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip 
                              label={penalty.reason}
                              color="error"
                              size="small"
                            />
                            <Chip 
                              label={`${penalty.amount >= 0 ? '+' : ''}${penalty.amount.toLocaleString('de-DE')} €`}
                              color={penalty.amount >= 0 ? "success" : "error"}
                              size="small"
                              icon={penalty.amount >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            />
                          </Box>
                        </Box>
                      </Box>
                      <Box>
                        <Tooltip title="Bearbeiten">
                          <IconButton onClick={() => openEditPenaltyDialog(penalty)} color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Löschen">
                          <IconButton onClick={() => deletePenalty(penalty.id!)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    {penalty.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {penalty.description}
                      </Typography>
                    )}
                    
                    <Typography variant="caption" color="text.secondary">
                      Datum: {new Date(penalty.date).toLocaleDateString('de-DE')} | 
                      Erstellt: {new Date(penalty.createdAt).toLocaleString('de-DE', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          
          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>💡 Hinweis:</strong> Strafen werden automatisch vom aktuellen Kontostand abgezogen und sind sofort in der Budget-Übersicht sichtbar.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
      )}

      {/* Import & Test Data Section */}
      {renderContext === 'json-import' && (
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Import & Testdaten"
          avatar={<Avatar sx={{ bgcolor: 'info.main' }}><CloudUploadIcon /></Avatar>}
        />
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={isLoading}
            >
              Kandidat*innen Backup importieren
              <input
                type="file"
                hidden
                accept="application/json"
                onChange={importParticipantsJSON}
              />
            </Button>
            <Button
              variant="contained"
              component="label"
              startIcon={<BackupIcon />}
              disabled={isLoading}
              color="primary"
            >
              Komplettbackup importieren
              <input
                type="file"
                hidden
                accept="application/json"
                onChange={importCompleteData}
              />
            </Button>
              
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>JSON Import:</strong> Gender wird automatisch von w/m zu F/M konvertiert. Der Import ersetzt alle bestehenden Kandidat*innen.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
      )}

      {/* Export Section */}
      {renderContext === 'json-import' && (
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Daten exportieren"
          avatar={<Avatar sx={{ bgcolor: 'success.main' }}><DownloadIcon /></Avatar>}
        />
        <CardContent>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2
          }}>
            {exportItems.map((item, index) => (
              <Card key={index} variant="outlined" sx={{ textAlign: 'center' }}>
                <CardContent>
                  <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 2 }}>
                    {item.icon}
                  </Avatar>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {item.count} Einträge
                  </Typography>
                  <Button
                    variant={item.variant || 'outlined'}
                    fullWidth
                    onClick={item.onClick}
                    disabled={item.disabled || isLoading}
                    startIcon={<DownloadIcon />}
                    color={!item.disabled && !isLoading ? 'success' : 'primary'}
                  >
                    Exportieren
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>💡 Tipp:</strong> Alle Exports werden als JSON-Dateien mit Datum heruntergeladen. Der Komplettexport enthält alle Daten in einer strukturierten Datei.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
      )}

      {/* Selective Delete Section */}
      {renderContext === 'json-import' && (
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Selektive Löschungen"
          avatar={<Avatar sx={{ bgcolor: 'warning.main' }}><DeleteSweepIcon /></Avatar>}
        />
        <CardContent>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2
          }}>
            {deleteItems.map((item, index) => (
              <Card key={index} variant="outlined" sx={{ textAlign: 'center' }}>
                <CardContent>
                  <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 2 }}>
                    {item.icon}
                  </Avatar>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {item.count} Einträge
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    onClick={item.onClick}
                    disabled={item.disabled || isLoading}
                    startIcon={<DeleteIcon />}
                  >
                    Alle löschen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>
      )}

      {/* Danger Zone */}
      {renderContext === 'json-import' && (
      <Card sx={{ border: '2px solid', borderColor: 'error.main', mb: 4 }}>
        <CardHeader 
          title="⚠️ Gefahrenzone"
          avatar={<Avatar sx={{ bgcolor: 'error.main' }}><WarningIcon /></Avatar>}
          sx={{ bgcolor: 'error.50' }}
        />
        <CardContent sx={{ textAlign: 'center' }}>
          <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'error.main' }}>
            Kompletter Datenbank-Reset
          </Typography>
          <Typography variant="body1" color="error.main" sx={{ mb: 3 }}>
            ⚠️ Diese Aktion löscht ALLE Daten unwiderruflich ({totalEntries} Einträge)
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="large"
            onClick={resetCompleteDatabase}
            disabled={isLoading || totalEntries === 0}
            startIcon={<DeleteSweepIcon />}
            sx={{ px: 4, py: 1.5, mb: 2 }}
          >
            Komplette Datenbank löschen
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Data Correction Tool */}
      {renderContext === 'json-import' && (
      <Card sx={{ border: '2px solid', borderColor: 'info.main', mb: 4 }}>
        <CardHeader 
          title="🔧 Daten-Korrektur"
          avatar={<Avatar sx={{ bgcolor: 'info.main' }}><AutoAwesomeIcon /></Avatar>}
          sx={{ bgcolor: 'info.50' }}
        />
        <CardContent>
          <Stack spacing={4}>
            {/* Matching Nights Korrektur */}
            <Box sx={{ textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'info.main' }}>
                Matching Nights korrigieren
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                🔄 Erkennt und korrigiert vertauschte Mann/Frau-Zuordnungen in Matching Nights
              </Typography>
              <Button
                variant="contained"
                color="info"
                size="large"
                onClick={fixSwappedMatchingNights}
                disabled={isLoading}
                startIcon={<AutoAwesomeIcon />}
                sx={{ px: 4, py: 1.5 }}
              >
                Matching Nights korrigieren
              </Button>
            </Box>

            <Divider />

            {/* Zeitstempel-Korrektur */}
            <Box sx={{ textAlign: 'center' }}>
              <NightlifeIcon sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'info.main' }}>
                Zeitstempel setzen
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                📅 Setzt die Ausstrahlungszeiten für alle Daten
              </Typography>
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Standardzeiten:
                </Typography>
                <Typography variant="body2" component="div">
                  • Matchbox: 20:15 Uhr (zuerst)<br />
                  • Matching Night: 21:00 Uhr (danach)<br />
                  • Nur Uhrzeiten werden gesetzt<br />
                  • Daten bleiben komplett unverändert
                </Typography>
              </Alert>
              <Button
                variant="contained"
                color="info"
                size="large"
                onClick={fixTimestamps}
                disabled={isLoading}
                startIcon={<NightlifeIcon />}
                sx={{ px: 4, py: 1.5 }}
              >
                Zeitstempel setzen
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      )}

      {/* Cache Management */}
      {renderContext === 'json-import' && (
      <Card sx={{ border: '2px solid', borderColor: 'warning.main', mb: 4 }}>
        <CardHeader 
          title="🗑️ Browser-Reset"
          avatar={<Avatar sx={{ bgcolor: 'warning.main' }}><CachedIcon /></Avatar>}
          sx={{ bgcolor: 'warning.50' }}
        />
        <CardContent sx={{ textAlign: 'center' }}>
          <CachedIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'warning.main' }}>
            Kompletter Browser-Reset
          </Typography>
          <Typography variant="body1" color="warning.main" sx={{ mb: 3 }}>
            🗑️ Löscht Cache, Cookies und alle gespeicherten Daten (Datenbank bleibt erhalten)
          </Typography>
          <Button
            variant="contained"
            color="warning"
            size="large"
            onClick={clearCache}
            disabled={isLoading}
            startIcon={<CachedIcon />}
            sx={{ px: 4, py: 1.5 }}
          >
            Browser zurücksetzen
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Help Section */}
      {renderContext === 'json-import' && (
      <Card variant="outlined">
        <CardHeader 
          title="Wichtige Hinweise"
          avatar={<Avatar sx={{ bgcolor: 'grey.400' }}><HelpOutlineIcon /></Avatar>}
        />
        <CardContent>
          <Alert severity="info">
            <Typography variant="body2" component="div">
              <strong>Wichtige Hinweise:</strong>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <li><strong>Export:</strong> Alle Daten können einzeln oder komplett als JSON exportiert werden</li>
                <li>Alle Löschvorgänge sind <strong>unwiderruflich</strong></li>
                <li>Vor jedem Vorgang erscheint eine Sicherheitsabfrage</li>
                <li>Kompletter Reset erfordert doppelte Bestätigung</li>
                
                <li><strong>JSON-Import:</strong> Gender wird automatisch von w/m zu F/M konvertiert</li>
                <li>JSON-Import ersetzt alle bestehenden Kandidat*innen</li>
              </Box>
            </Typography>
          </Alert>
        </CardContent>
      </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobileDialog}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {confirmDialog.severity === 'error' ? (
            <WarningIcon color="error" />
          ) : (
            <WarningIcon color="warning" />
          )}
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1, p: { xs: 2, sm: 1.5 } }}>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              confirmDialog.onConfirm()
              setConfirmDialog(prev => ({ ...prev, open: false }))
            }}
            color={confirmDialog.severity === 'error' ? 'error' : 'warning'}
            variant="contained"
            autoFocus
          >
            Bestätigen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Penalty Dialog */}
      <Dialog
        open={penaltyForm.showDialog}
        onClose={closePenaltyDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobileDialog}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningIcon color="error" />
          {editingPenalty ? 'Transaktion bearbeiten' : 'Neue Transaktion hinzufügen'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2
            }}>
              <FormControl fullWidth>
                <InputLabel>Kandidat*in</InputLabel>
                <Select
                  value={penaltyForm.participantName}
                  label="Kandidat*in"
                  onChange={(e) => setPenaltyForm({...penaltyForm, participantName: e.target.value})}
                >
                  {[...participants]
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'))
                    .map(participant => {
                      const hasPhoto = participant.photoUrl && participant.photoUrl.trim() !== ''
                      return (
                        <MenuItem key={participant.id} value={participant.name || ''}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={hasPhoto ? participant.photoUrl : undefined}
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: hasPhoto ? undefined : (participant.gender === 'F' ? 'secondary.main' : 'primary.main'),
                                fontSize: '0.875rem'
                              }}
                            >
                              {!hasPhoto && (participant.name?.charAt(0) || '?')}
                            </Avatar>
                            <Typography variant="body2" component="span">
                              {participant.name || 'Unbekannt'} ({participant.gender === 'F' ? 'F' : 'M'})
                            </Typography>
                          </Box>
                        </MenuItem>
                      )
                    })
                  }
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Grund"
                value={penaltyForm.reason}
                onChange={(e) => setPenaltyForm({...penaltyForm, reason: e.target.value})}
                placeholder="z.B. Regelverstoß, Unpünktlichkeit..."
              />
            </Box>

            <TextField
              fullWidth
              label="Betrag (€)"
              type="text"
              inputProps={{ 
                inputMode: 'decimal',
                pattern: '[0-9]*',
                step: 0.01
              }}
              value={penaltyForm.amount}
              onChange={(e) => {
                const value = e.target.value
                // Allow numbers, minus sign, and decimal point
                if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                  setPenaltyForm({...penaltyForm, amount: value})
                }
              }}
              helperText="Negative Beträge = Strafen | Positive Beträge = Gutschriften/Rückzahlungen"
              placeholder="-1000.00 oder +500.00"
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>
              }}
            />

            <TextField
              fullWidth
              label="Beschreibung (optional)"
              multiline
              rows={3}
              value={penaltyForm.description}
              onChange={(e) => setPenaltyForm({...penaltyForm, description: e.target.value})}
              placeholder="Zusätzliche Details zur Strafe..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1, p: { xs: 2, sm: 1.5 } }}>
          <Button onClick={closePenaltyDialog}>
            Abbrechen
          </Button>
          <Button
            onClick={savePenalty}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!penaltyForm.participantName || !penaltyForm.reason || !penaltyForm.amount || isNaN(parseFloat(penaltyForm.amount)) || parseFloat(penaltyForm.amount) === 0}
          >
            {editingPenalty ? 'Aktualisieren' : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Budget Settings Dialog */}
      <Dialog
        open={budgetSettings.showDialog}
        onClose={closeBudgetDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobileDialog}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SavingsIcon color="primary" />
          Startsumme ändern
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Geben Sie die neue Startsumme für das Budget ein. Dies beeinflusst die Berechnung des aktuellen Kontostands.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Neue Startsumme (€)"
            type="number"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            inputProps={{ min: 0, step: 1 }}
            placeholder="200000"
            sx={{ mb: 2 }}
          />
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Aktuelle Startsumme:</strong> {budgetSettings.startingBudget.toLocaleString('de-DE')} €<br />
              <strong>Verkäufe (Matchbox + Matching Night):</strong> {totalVerkauf >= 0 ? '+' : ''}{totalVerkauf.toLocaleString('de-DE')} €<br />
              <strong>Aktueller Kontostand:</strong> {currentBalance.toLocaleString('de-DE')} €
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1, p: { xs: 2, sm: 1.5 } }}>
          <Button onClick={closeBudgetDialog}>
            Abbrechen
          </Button>
          <Button
            onClick={saveBudgetSettings}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newBudget || parseInt(newBudget, 10) < 0}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {isLoading && (
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          bgcolor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <Paper sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography>Verarbeitung läuft...</Typography>
          </Paper>
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// ** Main AdminPanel Component
const AdminPanelMUI: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matchboxes, setMatchboxes] = useState<Matchbox[]>([])
  const [matchingNights, setMatchingNights] = useState<MatchingNight[]>([])
  const [penalties, setPenalties] = useState<Penalty[]>([])
  const [activeTab, setActiveTab] = useState('participants')
  const [editingParticipant, setEditingParticipant] = useState<Participant | undefined>(undefined)
  const [womenLimit, setWomenLimit] = useState(6)
  const [menLimit, setMenLimit] = useState(6)
  const [showParticipantForm, setShowParticipantForm] = useState(false)
  
  // Ref for the participant form to scroll to it
  const participantFormRef = useRef<HTMLDivElement>(null)
  const latestLoadRequestRef = useRef(0)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    const requestId = ++latestLoadRequestRef.current
    try {
      const [participantsData, matchboxesData, matchingNightsData, penaltiesData] = await Promise.all([
        ParticipantService.getAllParticipants(),
        MatchboxService.getAllMatchboxes(),
        MatchingNightService.getAllMatchingNights(),
        PenaltyService.getAllPenalties()
      ])

      // Guard gegen Race-Conditions beim schnellen Staffelwechsel.
      if (requestId !== latestLoadRequestRef.current) {
        return
      }
      
      setParticipants(participantsData)
      setMatchboxes(matchboxesData)
      setMatchingNights(matchingNightsData)
      setPenalties(penaltiesData)
      
      console.log('✅ Admin Panel: Daten direkt aus IndexedDB geladen')
    } catch (error) {
      console.error('❌ Fehler beim Laden der Admin Panel-Daten aus IndexedDB:', error)
    }
  }

  const handleEditParticipant = (participant: Participant) => {
    setEditingParticipant(participant)
    setShowParticipantForm(true)
    
    // Scroll to the form after a short delay to ensure it's rendered
    setTimeout(() => {
      participantFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  const handleDeleteParticipant = async (id: number) => {
    if (!confirm('Wirklich löschen?')) return
    try {
      // Verwende den ParticipantService, damit die Season-Zugehörigkeits-Prüfung greift
      await ParticipantService.deleteParticipant(id)
      loadAllData()
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      alert(`Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  const handleImportParticipantsJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const arr = JSON.parse(text) as LegacyParticipantJSON[] | { participants?: LegacyParticipantJSON[] }

      // Prüfe, ob es ein Array oder ein Objekt mit participants-Key ist
      const participantsArray: LegacyParticipantJSON[] = Array.isArray(arr) ? arr : (arr.participants || [])
      
      if (!Array.isArray(participantsArray) || participantsArray.length === 0) {
        alert('Die JSON-Datei enthält keine gültigen Kandidat*innen-Daten.')
        return
      }
      
      const seasonId = await getActiveSeasonId()
      await assertSeasonWritable(seasonId)

      const normalizedParticipants = participantsArray.map((participant) => {
        let gender = participant.gender
        if (gender === 'w' || gender === 'weiblich' || gender === 'female') {
          gender = 'F'
        } else if (gender === 'm' || gender === 'männlich' || gender === 'male') {
          gender = 'M'
        }

        let status = participant.status
        if (status === 'aktiv' || status === 'Aktiv') {
          status = 'Aktiv'
        } else if (status === 'perfekt match' || status === 'Perfekt Match') {
          status = 'Perfekt Match'
        }

        return {
          seasonId,
          name: participant.name || 'Unbekannt',
          knownFrom: participant.knownFrom || '',
          age: participant.age ? parseInt(participant.age.toString(), 10) : undefined,
          status: (status || 'Aktiv') as Participant['status'],
          active: participant.active !== false,
          photoUrl: participant.photoUrl || '',
          source: participant.source || '',
          bio: participant.bio || '',
          gender: (gender || 'F') as Participant['gender'],
          socialMediaAccount: participant.socialMediaAccount || '',
        }
      })
      
      const confirmed = confirm(
        `${normalizedParticipants.length} Kandidat*innen aus JSON importieren?\n\nDies ersetzt alle bestehenden Kandidat*innen!`
      )
      
      if (!confirmed) {
        e.target.value = ''
        return
      }
      
      try {
        await ParticipantService.replaceAllForActiveSeason(normalizedParticipants)

        await loadAllData()
        alert(`✅ Import erfolgreich! ${normalizedParticipants.length} Kandidat*innen wurden importiert.`)
      } catch (error) {
        console.error('Fehler beim Import:', error)
        alert(`❌ Fehler beim Import: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
      }
    } catch (error) {
      console.error('Fehler beim Import:', error)
      alert(`❌ Fehler beim Import: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n\nBitte überprüfen Sie die JSON-Datei.`)
    } finally {
      // Reset file input
      e.target.value = ''
    }
  }



  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab} onDataUpdate={loadAllData}>
      <Box>
        {/* Main Content */}
        <Card>

          {/* Participants */}
          {activeTab === 'participants' && (
            <Box sx={{ p: 3 }}>
              <ParticipantsList
                participants={participants}
                confirmedPerfectMatchNames={getConfirmedPerfectMatchNames(matchboxes)}
                onEdit={handleEditParticipant}
                onDelete={handleDeleteParticipant}
                womenLimit={womenLimit}
                menLimit={menLimit}
                onLoadMoreWomen={() => {
                  const women = participants.filter(p => p.gender === 'F')
                  setWomenLimit(women.length)
                }}
                onLoadMoreMen={() => {
                  const men = participants.filter(p => p.gender === 'M')
                  setMenLimit(men.length)
                }}
              />

              {/* Action Buttons */}
              <Box sx={{ mt: 4, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={editingParticipant ? <EditIcon /> : <AddIcon />}
                  onClick={() => {
                    setShowParticipantForm(!showParticipantForm)
                    if (!showParticipantForm) {
                      setTimeout(() => {
                        participantFormRef.current?.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'start' 
                        })
                      }, 100)
                    }
                  }}
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
                >
                  {editingParticipant ? 'Kandidat*in bearbeiten' : 'Einzelne Kandidat*innen hinzufügen'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  component="label"
                  sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
                >
                  JSON Datei Importieren
                  <input
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={handleImportParticipantsJSON}
                  />
                </Button>
              </Box>

              {/* Collapsible Add/Edit Form */}
              <Box ref={participantFormRef} sx={{ mt: 2 }}>
                
                <Collapse in={showParticipantForm}>
                  <Card variant="outlined">
                    <CardContent>
                      <ParticipantForm
                        initial={editingParticipant}
                        confirmedPerfectMatchNames={getConfirmedPerfectMatchNames(matchboxes)}
                        onSaved={() => {
                          setEditingParticipant(undefined)
                          setShowParticipantForm(false)
                          loadAllData() 
                        }} 
                        onCancel={() => {
                          setEditingParticipant(undefined)
                          setShowParticipantForm(false)
                        }}
                      />
                    </CardContent>
                  </Card>
                </Collapse>
              </Box>
            </Box>
          )}

          {/* Matching Nights */}
          {activeTab === 'matching-nights' && (
            <Box sx={{ p: 3 }}>
              <MatchingNightManagement 
                participants={participants}
                matchboxes={matchboxes}
                matchingNights={matchingNights}
                onUpdate={loadAllData}
              />
            </Box>
          )}

          {/* Matchbox */}
          {activeTab === 'matchbox' && (
            <Box sx={{ p: 3 }}>
              <MatchboxManagement 
                participants={participants}
                matchboxes={matchboxes}
                onUpdate={loadAllData}
              />
            </Box>
          )}

          {/* Broadcast */}
          {activeTab === 'broadcast' && (
            <Box sx={{ p: 3 }}>
              <BroadcastManagement 
                matchingNights={matchingNights}
                matchboxes={matchboxes}
                onUpdate={loadAllData}
              />
            </Box>
          )}

          {/* Settings (ohne Datenhaltungs-Sektionen) */}
          {activeTab === 'settings' && (
            <Box sx={{ p: 3 }}>
              <SettingsManagement 
                participants={participants}
                matchboxes={matchboxes}
                matchingNights={matchingNights}
                penalties={penalties}
                onUpdate={loadAllData}
                renderContext="settings"
              />
            </Box>
          )}

          {/* Einstellungen (Farben & Verläufe) */}
          {activeTab === 'appearance' && (
            <Box sx={{ p: 3 }}>
              <SettingsManagement
                participants={participants}
                matchboxes={matchboxes}
                matchingNights={matchingNights}
                penalties={penalties}
                onUpdate={loadAllData}
                renderContext="appearance"
              />
            </Box>
          )}

          {/* Datenhaltung (vormals JSON Import) */}
          {activeTab === 'json-import' && (
            <Box sx={{ p: 3 }}>
              <SettingsManagement 
                participants={participants}
                matchboxes={matchboxes}
                matchingNights={matchingNights}
                penalties={penalties}
                onUpdate={loadAllData}
                renderContext="json-import"
              />
            </Box>
          )}
        </Card>
      </Box>
    </AdminLayout>
  )
}

export default AdminPanelMUI
