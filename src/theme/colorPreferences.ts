export type AppColorPreferences = {
  primary: string
  secondary: string
}

export const DEFAULT_COLOR_PREFERENCES: AppColorPreferences = {
  primary: '#BD0A16',
  secondary: '#CD9536'
}

export const COLOR_PREFERENCES_STORAGE_KEY = 'ayto-theme-colors'
export const THEME_COLORS_UPDATED_EVENT = 'ayto:theme-colors-updated'

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value.trim())
}

export function sanitizeColorPreferences(input: Partial<AppColorPreferences>): AppColorPreferences {
  const primary = input.primary?.trim() ?? DEFAULT_COLOR_PREFERENCES.primary
  const secondary = input.secondary?.trim() ?? DEFAULT_COLOR_PREFERENCES.secondary

  return {
    primary: isHexColor(primary) ? primary : DEFAULT_COLOR_PREFERENCES.primary,
    secondary: isHexColor(secondary) ? secondary : DEFAULT_COLOR_PREFERENCES.secondary
  }
}

export function loadColorPreferences(): AppColorPreferences {
  try {
    const raw = localStorage.getItem(COLOR_PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_COLOR_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<AppColorPreferences>
    return sanitizeColorPreferences(parsed)
  } catch {
    return DEFAULT_COLOR_PREFERENCES
  }
}

export function saveColorPreferences(next: AppColorPreferences): void {
  const normalized = sanitizeColorPreferences(next)
  localStorage.setItem(COLOR_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(THEME_COLORS_UPDATED_EVENT, { detail: normalized }))
}

export function resetColorPreferences(): void {
  localStorage.removeItem(COLOR_PREFERENCES_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(THEME_COLORS_UPDATED_EVENT, { detail: DEFAULT_COLOR_PREFERENCES }))
}
