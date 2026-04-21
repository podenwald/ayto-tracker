import React, { useEffect, useState } from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { CacheProvider, type EmotionCache } from '@emotion/react'
import createCache from '@emotion/cache'
import { createAppTheme } from './index'
import {
  DEFAULT_COLOR_PREFERENCES,
  THEME_COLORS_UPDATED_EVENT,
  loadColorPreferences,
  type AppColorPreferences
} from './colorPreferences'

// ** Emotion Cache Setup
const createEmotionCache = (): EmotionCache => {
  return createCache({ key: 'css', prepend: true })
}

const clientSideEmotionCache = createEmotionCache()

interface ThemeProviderProps {
  children: React.ReactNode
  emotionCache?: EmotionCache
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  emotionCache = clientSideEmotionCache 
}) => {
  const [colors, setColors] = useState<AppColorPreferences>(DEFAULT_COLOR_PREFERENCES)

  useEffect(() => {
    setColors(loadColorPreferences())

    const syncTheme = () => {
      setColors(loadColorPreferences())
    }

    window.addEventListener(THEME_COLORS_UPDATED_EVENT, syncTheme)
    window.addEventListener('storage', syncTheme)
    return () => {
      window.removeEventListener(THEME_COLORS_UPDATED_EVENT, syncTheme)
      window.removeEventListener('storage', syncTheme)
    }
  }, [])

  const theme = createAppTheme(colors)

  return (
    <CacheProvider value={emotionCache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  )
}

export default ThemeProvider
