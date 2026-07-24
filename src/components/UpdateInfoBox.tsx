/**
 * Infobox auf der Startseite: zeigt einmalig den letzten Changelog-Eintrag,
 * nachdem die App automatisch im Hintergrund auf eine neue Version aktualisiert wurde.
 * Wird manuell über den Schließen-Button weggeklickt.
 */

import { useState } from 'react'
import { checkVersionChange, saveCurrentVersion } from '@/utils/versionCheck'
import { parseLatestChangelogEntry, type ChangelogEntry } from '@/utils/changelog'
import changelogRaw from '../../docs/CHANGELOG.md?raw'

export default function UpdateInfoBox() {
  // Einmalig (lazy) beim Mount ausgewertet, damit der Wert über StrictModes
  // doppelten Effect-/Render-Durchlauf hinweg stabil bleibt.
  const [isNewVersion] = useState(() => {
    const result = checkVersionChange().isNewVersion
    if (result) saveCurrentVersion() // sofort als "gesehen" markieren -> erscheint nur einmalig
    return result
  })
  const [entry] = useState<ChangelogEntry | null>(() =>
    isNewVersion ? parseLatestChangelogEntry(changelogRaw) : null
  )
  const [dismissed, setDismissed] = useState(false)

  if (!entry || dismissed) return null

  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        color: 'white',
        borderRadius: '14px',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255,255,255,0.18)',
        padding: '24px',
        paddingRight: '52px',
        marginBottom: '24px'
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Schließen"
        style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.18)',
          color: 'white',
          fontSize: '18px',
          lineHeight: 1,
          cursor: 'pointer'
        }}
      >
        ×
      </button>

      <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
        ✨ Neue Version {entry.version}
      </div>
      <div style={{ fontSize: '15px', opacity: 0.85, marginBottom: '16px' }}>
        {entry.date}
      </div>
      {entry.sections.map((section, i) => (
        <div key={i} style={{ marginBottom: '14px' }}>
          {section.heading && (
            <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: '6px' }}>
              {section.heading}
            </div>
          )}
          <ul style={{ margin: 0, paddingLeft: '22px' }}>
            {section.items.map((item, j) => (
              <li key={j} style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.95, marginBottom: '4px' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
