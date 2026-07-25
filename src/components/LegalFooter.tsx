import { useState } from 'react'
import { getDisplayVersion, VERSION_INFO } from '@/utils/version'

export default function LegalFooter() {
  const [showImpressum, setShowImpressum] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showVersionDetails, setShowVersionDetails] = useState(false)

  return (
    <>
      <footer style={{
        marginTop: '2rem',
        padding: '12px 16px',
        borderTop: '1px solid #e5e7eb',
        color: '#4b5563',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <span>© {new Date().getFullYear()} AYTO-Tracker</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <button 
          onClick={() => setShowVersionDetails(true)} 
          style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            backgroundColor: '#f3f4f6', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#e5e7eb'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6'}
        >
          {getDisplayVersion()}
        </button>
        <span style={{ opacity: 0.5 }}>·</span>
        <button onClick={() => setShowImpressum(true)} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Impressum</button>
        <span style={{ opacity: 0.5 }}>·</span>
        <button onClick={() => setShowPrivacy(true)} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Datenschutz</button>
      </footer>

      {showImpressum && (
        <div role="dialog" aria-modal="true" onClick={() => setShowImpressum(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', maxWidth: 640, width: '90%', padding: 20, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Impressum</h3>
              <button onClick={() => setShowImpressum(false)} aria-label="Schließen" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
              <p style={{ margin: '8px 0' }}><strong>Angaben gemäß § 5 TMG</strong></p>
              <p style={{ margin: '8px 0' }}>Patrick Odenwald</p>
              <p style={{ margin: '8px 0' }}>📧 E-Mail: <a href="mailto:ayto-tracker@patrick-odenwald.de">ayto-tracker@patrick-odenwald.de</a></p>
              <p style={{ margin: '8px 0' }}>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Patrick Odenwald, Seilbahnweg 44, 42781 Haan Gruiten</p>
            </div>
          </div>
        </div>
      )}

      {showPrivacy && (
        <div role="dialog" aria-modal="true" onClick={() => setShowPrivacy(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', maxWidth: 720, width: '90%', padding: 20, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Datenschutzerklärung</h3>
              <button onClick={() => setShowPrivacy(false)} aria-label="Schließen" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
              <p style={{ margin: '8px 0' }}><strong>1. Verantwortlicher</strong><br/>Patrick Odenwald<br/>Adresse wie im Impressum<br/>E-Mail: <a href="mailto:ayto-tracker@patrick-odenwald.de">ayto-tracker@patrick-odenwald.de</a></p>
              <p style={{ margin: '8px 0' }}><strong>2. Hosting und Server-Logs</strong><br/>Diese Website wird bei der netcup GmbH (Karlsfeld, Deutschland) gehostet. Beim Besuch der Website werden automatisch Daten wie IP-Adresse, Browsertyp und Zeitpunkt des Zugriffs erfasst (Server-Logs). Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und stabilen Betrieb der Website (Art. 6 Abs. 1 lit. f DSGVO). Die Logs werden täglich rotiert und nach spätestens 14 Tagen automatisiert gelöscht. Eine weitergehende Verarbeitung findet nicht statt.</p>
              <p style={{ margin: '8px 0' }}><strong>3. Lokale Datenspeicherung im Browser (IndexedDB)</strong><br/>Alle Inhalte, die Sie in AYTO-Tracker eingeben oder ansehen (z. B. Kandidat*innen, Matching Nights, Matchboxes), werden ausschließlich lokal in Ihrem Browser gespeichert (IndexedDB). Diese Daten werden nicht an unsere Server oder Dritte übertragen und verlassen Ihr Gerät nicht. Löschen Sie den Browser-Speicher (bzw. die Website-Daten) Ihres Browsers, werden auch diese lokalen Daten gelöscht.</p>
              <p style={{ margin: '8px 0' }}><strong>4. Schriftarten</strong><br/>Die auf dieser Website verwendete Schriftart (Inter) wird selbst gehostet und lokal von unserem Server ausgeliefert. Es findet keine Verbindung zu externen Font-Anbietern (z. B. Google Fonts) statt, wodurch keine Daten an Dritte übertragen werden.</p>
              <p style={{ margin: '8px 0' }}><strong>5. Cookies</strong><br/>Diese Website verwendet keine Cookies, außer technisch notwendige (z. B. Session-Cookies).</p>
              <p style={{ margin: '8px 0' }}><strong>6. Nutzung von GitHub für Feedback</strong><br/>Für Feedback verweisen wir auf GitHub Issues. Bitte beachten: Daten unterliegen den Datenschutzbestimmungen von GitHub (GitHub Inc.).</p>
              <p style={{ margin: '8px 0' }}><strong>7. Social Media</strong><br/>Wir nutzen ggf. Social-Media-Kanäle (z. B. Instagram, LinkedIn, TikTok). Bei Besuch unserer Profile gelten die Datenschutzbestimmungen der jeweiligen Plattformen.</p>
              <p style={{ margin: '8px 0' }}><strong>8. Ihre Rechte</strong><br/>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit bezüglich Ihrer bei uns gespeicherten Daten sowie ein Widerspruchsrecht gegen die Verarbeitung. Wenden Sie sich dazu an die im Impressum angegebene E-Mail-Adresse. Außerdem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist in der Regel die Aufsichtsbehörde Ihres Bundeslandes bzw. gewöhnlichen Aufenthaltsortes.</p>
              <p style={{ margin: '8px 0' }}><strong>9. Stand</strong><br/>Diese Datenschutzerklärung hat den Stand: 25.07.2026</p>
            </div>
          </div>
        </div>
      )}

      {showVersionDetails && (
        <div role="dialog" aria-modal="true" onClick={() => setShowVersionDetails(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', maxWidth: 480, width: '90%', padding: 20, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Versionsinformationen</h3>
              <button onClick={() => setShowVersionDetails(false)} aria-label="Schließen" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Version:</strong> {getDisplayVersion()}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Git Tag:</strong> {VERSION_INFO.gitTag || 'Kein Tag'}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Commit:</strong> {VERSION_INFO.gitCommit.substring(0, 7)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Build Date:</strong> {new Date(VERSION_INFO.buildDate).toLocaleString('de-DE')}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Environment:</strong> {VERSION_INFO.isProduction ? 'Production' : 'Development'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
