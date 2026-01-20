import React, { useState, useEffect } from 'react'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Card,
  Avatar,
  Button,
  Tooltip
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Nightlife as NightlifeIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
  LightMode as LightModeIcon,
  AutoAwesome as AutoAwesomeIcon,
  Savings as SavingsIcon,
  Percent as PercentIcon,
  People as PeopleIcon
} from '@mui/icons-material'

const drawerWidth = 260

interface MenuLayoutProps {
  children: React.ReactNode
  activeTab?: string
  onTabChange?: (tab: string) => void
  onCreateMatchbox?: () => void
  onCreateMatchingNight?: () => void
  // Statistics data
  matchingNightsCount?: number
  currentLights?: number
  perfectMatchesCount?: number
  currentBalance?: number
  participantsCount?: number
}

const MenuLayout: React.FC<MenuLayoutProps> = ({ 
  children, 
  activeTab,
  onTabChange,
  onCreateMatchbox,
  onCreateMatchingNight,
  matchingNightsCount = 0,
  currentLights = 0,
  perfectMatchesCount = 0,
  currentBalance = 0,
  participantsCount = 0
}) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // Prüfe, ob Onboarding angezeigt werden soll
  useEffect(() => {
    const onboardingShown = localStorage.getItem('ayto-onboarding-shown')
    const shouldShow = !onboardingShown && participantsCount === 0
    
    if (shouldShow) {
      // Kleine Verzögerung, damit die Seite vollständig geladen ist
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [participantsCount])

  const handleOnboardingDismiss = () => {
    setShowOnboarding(false)
    localStorage.setItem('ayto-onboarding-shown', 'true')
  }

  const handleSettingsClick = () => {
    if (showOnboarding) {
      handleOnboardingDismiss()
    }
    window.location.href = '/admin'
  }

  const menuItems = [
    {
      text: 'Home',
      icon: <HomeIcon />,
      value: 'overview'
    },
    {
      text: 'Kandidat*innen',
      icon: <PeopleIcon />,
      value: 'candidates'
    },
    {
      text: 'Matching Nights',
      icon: <NightlifeIcon />,
      value: 'matching-nights'
    },
    {
      text: 'Matchbox',
      icon: <InventoryIcon />,
      value: 'matchbox'
    },
    {
      text: 'Wahrscheinlichkeit',
      icon: <PercentIcon />,
      value: 'probabilities'
    }
  ]

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
              fontSize: '1.25rem',
              fontWeight: 600
            }}
          >
            A
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              AYTO
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Live-Tracker 2026
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 2 }}>
        <List sx={{ px: 2, pt: 0 }}>
          {menuItems.map((item) => (
            <ListItem key={item.value} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  onTabChange?.(item.value)
                }}
                sx={{
                  borderRadius: 1.5,
                  px: 2,
                  py: 1.5,
                  backgroundColor: activeTab === item.value ? 'primary.main' : 'transparent',
                  color: activeTab === item.value ? 'white !important' : 'text.primary',
                  '&:hover': {
                    backgroundColor: activeTab === item.value 
                      ? 'primary.dark' 
                      : 'action.hover'
                  },
                  '& .MuiListItemIcon-root': {
                    color: activeTab === item.value ? 'white !important' : 'inherit'
                  },
                  '& .MuiListItemText-primary': {
                    color: activeTab === item.value ? 'white !important' : 'inherit'
                  }
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: 'inherit',
                    minWidth: 40
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: activeTab === item.value ? 600 : 500
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Statistics */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography 
          variant="overline" 
          sx={{ 
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            mb: 1,
            display: 'block'
          }}
        >
          Statistiken
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Matching Nights */}
          <Card sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                <NightlifeIcon sx={{ fontSize: '0.875rem' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                  Matching Nights
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {matchingNightsCount}
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Current Lights */}
          <Card sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', width: 28, height: 28 }}>
                <LightModeIcon sx={{ fontSize: '0.875rem' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                  Lichter aktuell
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  {currentLights}
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Perfect Matches */}
          <Card sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 28, height: 28 }}>
                <AutoAwesomeIcon sx={{ fontSize: '0.875rem' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                  Perfect Matches
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {perfectMatchesCount}
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Current Balance */}
          <Card sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: currentBalance >= 0 ? 'success.main' : 'error.main', width: 28, height: 28 }}>
                <SavingsIcon sx={{ fontSize: '0.875rem' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                  Kontostand
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: currentBalance >= 0 ? 'success.main' : 'error.main' }}>
                  {currentBalance.toLocaleString('de-DE')} €
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0px 2px 4px rgba(165, 163, 174, 0.3)',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { lg: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            AYTO 2026 - Live-Tracker
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            {/* Mobile: Icon-only buttons */}
            <Tooltip title="Neue Matching Night" arrow>
              <IconButton
                color="secondary"
                onClick={onCreateMatchingNight}
                sx={{ 
                  display: { xs: 'flex', sm: 'none' },
                  bgcolor: 'secondary.main',
                  color: 'white',
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  padding: 0,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'secondary.dark'
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.05rem'
                  }
                }}
                aria-label="Neue Matching Night"
              >
                <NightlifeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Neue Matchbox" arrow>
              <IconButton
                color="primary"
                onClick={onCreateMatchbox}
                sx={{ 
                  display: { xs: 'flex', sm: 'none' },
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  padding: 0,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.05rem'
                  }
                }}
                aria-label="Neue Matchbox"
              >
                <InventoryIcon />
              </IconButton>
            </Tooltip>
            {/* Desktop: Buttons with text */}
            <Button 
              variant="contained" 
              color="secondary" 
              size="small"
              startIcon={<NightlifeIcon />} 
              onClick={onCreateMatchingNight}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Neue Matching Night
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              size="small"
              startIcon={<InventoryIcon />} 
              onClick={onCreateMatchbox}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Neue Matchbox
            </Button>
          </Box>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {showOnboarding && (
              <Box
                sx={{
                  position: 'absolute',
                  right: 48,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'primary.main',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1300,
                  animation: 'pulse 2s infinite',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: -8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 0,
                    height: 0,
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderLeft: '8px solid',
                    borderLeftColor: 'primary.main'
                  }
                }}
              >
                Kandidat*innen hinzufügen
              </Box>
            )}
            <Tooltip 
              title={showOnboarding ? "Kandidat*innen hinzufügen" : "Einstellungen"}
              open={showOnboarding ? true : undefined}
              arrow
            >
              <IconButton
                onClick={handleSettingsClick}
                sx={{
                  opacity: showOnboarding ? 1 : 0.6,
                  color: showOnboarding ? 'primary.main' : 'text.secondary',
                  position: 'relative',
                  animation: showOnboarding ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': {
                      boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)',
                    },
                    '70%': {
                      boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)',
                    },
                    '100%': {
                      boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
                    },
                  },
                  '&:hover': {
                    opacity: 1,
                    color: 'primary.main'
                  }
                }}
                aria-label="Einstellungen"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider'
            }
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh'
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }} />
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}

export default MenuLayout
