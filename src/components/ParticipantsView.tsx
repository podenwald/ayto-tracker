import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Avatar,
  Badge
} from '@mui/material'
import {
  Woman as WomanIcon,
  Man as ManIcon,
  People as PeopleIcon
} from '@mui/icons-material'
import type { Participant } from '@/types'

interface ParticipantsViewProps {
  participants: Participant[]
}

/**
 * Komponente zur Anzeige der Teilnehmer ohne Edit/Delete-Funktionen
 * Wird im Frontend verwendet
 */
const ParticipantsView: React.FC<ParticipantsViewProps> = ({ participants }) => {
  const [womenLimit, setWomenLimit] = useState(6)
  const [menLimit, setMenLimit] = useState(6)
  
  const women = participants.filter(p => p.gender === 'F')
  const men = participants.filter(p => p.gender === 'M')

  return (
    <Card>
      <CardHeader 
        title={`Kandidat*innen (${participants.length})`}
        avatar={<Avatar sx={{ bgcolor: 'info.main' }}><PeopleIcon /></Avatar>}
      />
      <CardContent>
        {/* Gender-based sections */}
        <Box sx={{ mb: 4 }}>
          {/* Women Section */}
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: 'pink.main' }}>
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
                    backgroundImage: (participant.photoUrl && participant.photoUrl.trim() !== '') ? `url(${participant.photoUrl})` : (participant.gender === 'F' ? 'linear-gradient(135deg, #E91E63 0%, #AD1457 100%)' : 'linear-gradient(135deg, #16B1FF 0%, #0288D1 100%)'),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
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
                        backgroundColor: participant.active !== false ? 'success.main' : '#EC4899',
                        ...(participant.active === false && {
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
                        mb: 1
                      }}
                    >
                      {participant.knownFrom || '—'}
                    </Typography>
                    {participant.bio && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'white',
                          fontWeight: 'normal',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          fontSize: '0.75rem'
                        }}
                      >
                        {participant.bio}
                      </Typography>
                    )}
                  </Box>
                </Card>
              ))}
            </Box>
            {womenLimit < women.length && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="outlined" onClick={() => setWomenLimit(women.length)}>
                  Alle laden
                </Button>
              </Box>
            )}
          </Box>

          {/* Men Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: 'info.main' }}>
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
                    backgroundImage: (participant.photoUrl && participant.photoUrl.trim() !== '') ? `url(${participant.photoUrl})` : (participant.gender === 'F' ? 'linear-gradient(135deg, #E91E63 0%, #AD1457 100%)' : 'linear-gradient(135deg, #16B1FF 0%, #0288D1 100%)'),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
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
                        backgroundColor: participant.active !== false ? 'success.main' : '#EC4899',
                        ...(participant.active === false && {
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
                        mb: 1
                      }}
                    >
                      {participant.knownFrom || '—'}
                    </Typography>
                    {participant.bio && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'white',
                          fontWeight: 'normal',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          fontSize: '0.75rem'
                        }}
                      >
                        {participant.bio}
                      </Typography>
                    )}
                  </Box>
                </Card>
              ))}
            </Box>
            {menLimit < men.length && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="outlined" onClick={() => setMenLimit(men.length)}>
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

export default ParticipantsView
