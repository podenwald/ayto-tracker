/**
 * Modal auf der Startseite: zeigt einmalig den letzten Changelog-Eintrag,
 * nachdem die App automatisch im Hintergrund auf eine neue Version aktualisiert wurde.
 * Design passend zu Impressum/Datenschutz/Versionsinformationen (LegalFooter.tsx).
 * Wird manuell über den Schließen-Button weggeklickt.
 */

import { useState } from 'react'
import { checkVersionChange, saveCurrentVersion } from '@/utils/versionCheck'
import { parseLatestChangelogEntry, type ChangelogEntry } from '@/utils/changelog'
import changelogRaw from '../../docs/CHANGELOG-USER.md?raw'

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

  const close = () => setDismissed(true)

  return (
    <div role="dialog" aria-modal="true" onClick={close} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', maxWidth: 480, width: '90%', padding: 20, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>✨ Neue Version {entry.version}</h3>
          <button onClick={close} aria-label="Schließen" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
          <p style={{ margin: '8px 0', color: '#6b7280' }}>{entry.date}</p>
          {entry.sections.map((section, i) => (
            <div key={i} style={{ margin: '8px 0' }}>
              {section.heading && <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{section.heading}</p>}
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {section.items.map((item, j) => (
                  <li key={j} style={{ margin: '4px 0' }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
