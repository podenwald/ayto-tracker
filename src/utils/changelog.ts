export interface ChangelogSection {
  heading: string
  items: string[]
}

export interface ChangelogEntry {
  version: string
  date: string
  sections: ChangelogSection[]
}

/**
 * Extrahiert nur den allerersten (= aktuellsten) Versions-Abschnitt aus docs/CHANGELOG.md.
 * Erwartetes Format:
 *   ## [1.3.0] - 2026-07-24
 *   ### 🐛 Bugfixes
 *   - ...
 *   ---
 *   ## [1.2.1] - ...
 */
export function parseLatestChangelogEntry(markdown: string): ChangelogEntry | null {
  const headingMatch = markdown.match(/^##\s*\[([^\]]+)\]\s*-\s*(.+)$/m)
  if (!headingMatch) return null

  const version = headingMatch[1].trim()
  const date = headingMatch[2].trim()

  const bodyStart = (headingMatch.index ?? 0) + headingMatch[0].length
  const rest = markdown.slice(bodyStart)
  const nextHeadingIndex = rest.search(/^##\s*\[/m)
  const body = nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex)

  const sections: ChangelogSection[] = []
  let current: ChangelogSection | null = null

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (!line || line === '---') continue

    const sectionMatch = line.match(/^###\s*(.+)$/)
    if (sectionMatch) {
      current = { heading: sectionMatch[1].trim(), items: [] }
      sections.push(current)
      continue
    }

    const itemMatch = line.match(/^-\s*(.+)$/)
    if (itemMatch) {
      if (!current) {
        current = { heading: '', items: [] }
        sections.push(current)
      }
      current.items.push(itemMatch[1].trim())
    }
  }

  return { version, date, sections }
}
