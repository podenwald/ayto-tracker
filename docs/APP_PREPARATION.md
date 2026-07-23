# App-Vorbereitung: AYTO-Tracker

> Stand 2026-07-23: Die PWA-Grundlagen (Option A, Phase 1) sind inzwischen erledigt und die App ist als v1.2.1 live im Einsatz. Eine native App (Option B/C) ist laut der README-Roadmap bzw. `README.md` **nicht geplant** - die Checklisten dazu unten sind als Referenz stehen geblieben, falls sich das mal ändert.

## 📋 Übersicht: Aktueller Stand

### ✅ Bereits vorhanden:
- ✅ PWA-Grundlagen (Service Worker via `vite-plugin-pwa`, Web-App-Manifest)
- ✅ Offline-Funktionalität (IndexedDB via Dexie)
- ✅ Responsive Design (Smartphone/Tablet/Desktop, inkl. Vollbild-Dialoge auf Mobile seit v1.2.1)
- ✅ Device Detection
- ✅ App-Icons (192x192, 512x512, maskable)
- ✅ Apple Touch Icon
- ✅ Mehrere Staffeln parallel verwaltbar
- ✅ Automatisierter Deploy (GitHub Actions → FTP → Netcup-vServer)

### ⚠️ Noch offen (siehe auch der README-Roadmap):
- Wahrscheinlichkeits-Analyse ist implementiert, aber im Menü deaktiviert
- Keine automatisierte Test-Suite
- Code-Splitting fehlt (Bundle > 500 kB)

---

## 🎯 Option A: PWA optimieren (Empfohlen für schnellen Start)

### Phase 1: PWA-Manifest optimieren
1. **Manifest vervollständigen**
   - [ ] `manifest.webmanifest` mit allen erforderlichen Feldern
   - [ ] `short_name` auf max. 12 Zeichen kürzen (iOS)
   - [ ] `description` hinzufügen
   - [ ] `categories` hinzufügen (z.B. "Entertainment", "Games")
   - [ ] `screenshots` für App Stores vorbereiten
   - [ ] `shortcuts` für Quick Actions

2. **App-Icons vervollständigen**
   - [ ] Alle iOS-Größen (20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024)
   - [ ] Android adaptive icons (108x108, 162x162, 192x192, 432x432)
   - [ ] Favicon-Set (16x16, 32x32, 96x96, 180x180)
   - [ ] Splash Screens für iOS (alle Gerätegrößen)

3. **iOS-Spezifische Anpassungen**
   - [ ] `apple-mobile-web-app-capable` Meta-Tag
   - [ ] `apple-mobile-web-app-status-bar-style`
   - [ ] `apple-mobile-web-app-title`
   - [ ] Splash Screen Meta-Tags

4. **Android-Spezifische Anpassungen**
   - [ ] `theme-color` Meta-Tag
   - [ ] `mask-icon` für Safari
   - [ ] `display: standalone` optimieren

### Phase 2: App-Store-Vorbereitung (PWA)
5. **App Store Listing vorbereiten**
   - [ ] App-Name (max. 30 Zeichen)
   - [ ] Beschreibung (kurz/lang)
   - [ ] Keywords für SEO
   - [ ] Screenshots (verschiedene Geräte)
   - [ ] Promo-Video (optional)
   - [ ] Privacy Policy URL
   - [ ] Support URL

6. **Installation Flow verbessern**
   - [ ] Install-Prompt für Android/iOS
   - [ ] "Add to Home Screen" Anleitung
   - [ ] Install-Banner-Komponente
   - [ ] Update-Benachrichtigungen

### Phase 3: Native Features (PWA)
7. **Native APIs integrieren**
   - [ ] Share API (Teilen von Ergebnissen)
   - [ ] File System Access API (Export/Import)
   - [ ] Clipboard API (Kopieren von Daten)
   - [ ] Fullscreen API
   - [ ] Vibration API (Feedback)
   - [ ] Badge API (Benachrichtigungen)

8. **Performance optimieren**
   - [ ] Code Splitting verbessern
   - [ ] Lazy Loading für Routes
   - [ ] Image Optimization
   - [ ] Bundle Size reduzieren (< 500KB)
   - [ ] Lighthouse Score > 90

### Phase 4: Testing & Deployment
9. **Testing**
   - [ ] iOS Safari (iPhone/iPad)
   - [ ] Android Chrome
   - [ ] Offline-Modus testen
   - [ ] Install-Flow testen
   - [ ] Update-Flow testen

10. **Deployment**
    - [ ] HTTPS erforderlich (PWA)
    - [ ] Service Worker registrieren
    - [ ] Manifest verifizieren
    - [ ] App Store Submission (PWABuilder/TWA)

---

## 🎯 Option B: Native App (Capacitor/Cordova)

### Phase 1: Framework Setup
1. **Capacitor installieren**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npm install @capacitor/ios @capacitor/android
   npx cap init
   ```

2. **Native Plugins hinzufügen**
   - [ ] Camera Plugin (für Fotos)
   - [ ] File System Plugin
   - [ ] Share Plugin
   - [ ] Status Bar Plugin
   - [ ] Splash Screen Plugin
   - [ ] Keyboard Plugin
   - [ ] App Plugin (Lifecycle)

### Phase 2: Native Konfiguration
3. **iOS-Konfiguration**
   - [ ] `ios/App/Info.plist` anpassen
   - [ ] App-Icons generieren
   - [ ] Splash Screens erstellen
   - [ ] Permissions konfigurieren
   - [ ] Bundle Identifier setzen

4. **Android-Konfiguration**
   - [ ] `android/app/build.gradle` anpassen
   - [ ] App-Icons generieren
   - [ ] Splash Screens erstellen
   - [ ] Permissions in `AndroidManifest.xml`
   - [ ] Package Name setzen

### Phase 3: Native Features
5. **Native Funktionen implementieren**
   - [ ] Push Notifications
   - [ ] In-App Purchases (optional)
   - [ ] Biometric Authentication (optional)
   - [ ] Deep Linking
   - [ ] Background Sync

### Phase 4: Build & Distribution
6. **Build-Prozess**
   - [ ] iOS Build (Xcode)
   - [ ] Android Build (Android Studio)
   - [ ] Signing konfigurieren
   - [ ] CI/CD Pipeline

7. **App Store Submission**
   - [ ] Apple App Store
   - [ ] Google Play Store
   - [ ] Beta-Testing (TestFlight/Internal Testing)

---

## 🎯 Option C: Hybrid (PWA + Native Wrapper)

Kombination aus beiden Ansätzen:
- PWA als Basis
- Native Wrapper für App Stores
- Beste Performance + Features

---

## 🔧 Funktionen-Anpassungen

### Welche Funktionen sollen angepasst werden?

Bitte spezifizieren:
1. **UI/UX Anpassungen**
   - [ ] Design-Änderungen
   - [ ] Navigation verbessern
   - [ ] Mobile-Erfahrung optimieren

2. **Neue Features**
   - [ ] Welche Features fehlen?
   - [ ] Welche Funktionen sollen hinzugefügt werden?

3. **Performance**
   - [ ] Ladezeiten optimieren
   - [ ] Speicherverbrauch reduzieren
   - [ ] Offline-Funktionalität erweitern

4. **Daten & Sync**
   - [ ] Cloud-Sync implementieren
   - [ ] Backup-Funktion
   - [ ] Multi-Device-Support

---

## 📝 Nächste Schritte

1. **Entscheidung treffen**: PWA, Native App, oder Hybrid?
2. **Funktionen spezifizieren**: Welche Anpassungen sind gewünscht?
3. **Prioritäten setzen**: Was ist am wichtigsten?
4. **Umsetzung starten**: Schritt für Schritt implementieren

---

## 📚 Ressourcen

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Guidelines](https://play.google.com/about/developer-content-policy/)
