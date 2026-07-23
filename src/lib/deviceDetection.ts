import React from 'react'

/**
 * Device Detection Utilities
 * Erweiterte Geräteerkennung für Smartphones vs Tablets
 */

export interface DeviceInfo {
  isSmartphone: boolean
  isTablet: boolean
  isDesktop: boolean
  isMobile: boolean // Smartphone only
  /** True wenn das Gerät Touch-Eingabe hat (z. B. iPad auch bei „Desktop-Website“) */
  hasTouch: boolean
  orientation: 'portrait' | 'landscape'
  screenWidth: number
  screenHeight: number
}

/**
 * Erkennt den Gerätetyp basierend auf User Agent und Bildschirmgröße
 */
export const detectDevice = (): DeviceInfo => {
  const userAgent = navigator.userAgent.toLowerCase()
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait'
  
  // Smartphone Detection
  const isSmartphone = 
    // Kleine Bildschirme (typisch für Smartphones)
    (screenWidth <= 480 && screenHeight <= 900) ||
    // User Agent Patterns für Smartphones
    /android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  
  // Tablet Detection
  const isTablet = 
    // Mittlere Bildschirme (typisch für Tablets)
    (screenWidth > 480 && screenWidth <= 1024 && screenHeight > 600) ||
    // User Agent Patterns für Tablets
    /ipad|android(?!.*mobile)|tablet/i.test(userAgent)
  
  // Desktop Detection
  const isDesktop = screenWidth > 1024 && !isTablet && !isSmartphone

  // Touch-Erkennung: zuverlässig auch wenn iPad als Desktop meldet (Safari „Desktop-Website“)
  const hasTouch =
    typeof navigator !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || ('ontouchstart' in window))
  
  return {
    isSmartphone,
    isTablet,
    isDesktop,
    isMobile: isSmartphone, // Nur Smartphones gelten als "mobile"
    hasTouch,
    orientation,
    screenWidth,
    screenHeight
  }
}

/**
 * Hook für React Components zur Geräteerkennung
 */
export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(() => detectDevice())
  
  React.useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo(detectDevice())
    }
    
    // Listener für Orientierungsänderungen
    window.addEventListener('orientationchange', updateDeviceInfo)
    window.addEventListener('resize', updateDeviceInfo)
    
    return () => {
      window.removeEventListener('orientationchange', updateDeviceInfo)
      window.removeEventListener('resize', updateDeviceInfo)
    }
  }, [])
  
  return deviceInfo
}

/**
 * Legacy-Kompatibilität: Orientierung wird nicht mehr blockiert.
 * Stattdessen werden im UI nicht-blockierende Hinweise angezeigt.
 */
export const lockTabletOrientation = (): void => {
  // no-op
}

/**
 * Legacy-Kompatibilität: Orientierung wird nicht mehr blockiert.
 * Stattdessen werden im UI nicht-blockierende Hinweise angezeigt.
 */
export const lockSmartphoneOrientation = (): void => {
  // no-op
}

/**
 * CSS Media Query Helper für erweiterte Geräteerkennung
 */
export const getDeviceMediaQuery = (deviceInfo: DeviceInfo): string => {
  if (deviceInfo.isSmartphone) {
    return '(max-width: 600px)'
  } else if (deviceInfo.isTablet) {
    return '(min-width: 601px) and (max-width: 1024px)'
  } else {
    return '(min-width: 1025px)'
  }
}
