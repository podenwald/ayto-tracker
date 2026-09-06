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
  "version": "1.9.2",
  "gitTag": "v1.9.1",
  "gitCommit": "c551ceca33abb4fcfae57e060230a543b28ca44d",
  "buildDate": "2026-09-06T15:30:07.145Z",
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
