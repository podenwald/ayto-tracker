// Version information that gets injected at build time
export interface VersionInfo {
  version: string
  gitTag: string | null
  gitCommit: string
  buildDate: string
  isProduction: boolean
}

// This will be replaced by Vite during build
export const VERSION_INFO: VersionInfo = {
  "version": "1.10.0",
  "gitTag": "v1.9.5",
  "gitCommit": "957ddbc04069d11b6b7f9dda22d4581203e5aeb4",
  "buildDate": "2026-09-18T18:37:06.393Z",
  "isProduction": false
}

export function getDisplayVersion(): string {
  if (VERSION_INFO.gitTag) {
    return VERSION_INFO.gitTag
  }
  return 'Beta'
}

export function getFullVersionInfo(): string {
  const displayVersion = getDisplayVersion()
  const commit = VERSION_INFO.gitCommit.substring(0, 7)
  return `${displayVersion} (${commit})`
}
