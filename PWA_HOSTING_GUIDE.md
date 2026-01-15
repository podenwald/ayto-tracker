# PWA Hosting-Anforderungen & Anleitung

## 🔒 Technische Mindestanforderungen

### 1. **HTTPS ist Pflicht** ⚠️
- ✅ **Service Worker funktioniert NUR über HTTPS**
- ✅ Ausnahme: `localhost` für Entwicklung
- ✅ Alle modernen Hosting-Provider bieten HTTPS kostenlos

### 2. **Korrekte MIME-Types**
Dein Projekt hat bereits `_headers` Datei für Netlify:
```
manifest.webmanifest → application/manifest+json
sw.js → application/javascript
.json → application/json
```

### 3. **SPA-Routing (Single Page Application)**
Dein Projekt hat bereits `_redirects` Datei:
```
/*    /index.html   200
```
→ Alle Routes werden auf `index.html` umgeleitet

### 4. **Service Worker Support**
- ✅ Muss im Root-Verzeichnis erreichbar sein: `/sw.js`
- ✅ Muss über HTTPS ausgeliefert werden
- ✅ Cache-Control: `no-store` (bereits in `_headers`)

---

## 🎯 Hosting-Optionen für PWA

### Option 1: **Netlify** (Empfohlen) ⭐

#### ✅ Vorteile:
- ✅ **Kostenlos** für kleine Projekte
- ✅ HTTPS automatisch (Let's Encrypt)
- ✅ CI/CD Integration (GitHub Actions)
- ✅ CDN global
- ✅ Dein Projekt ist bereits dafür vorbereitet (`_headers`, `_redirects`)

#### 📋 Setup:
1. **Account erstellen**: [netlify.com](https://netlify.com)
2. **Site erstellen**:
   - "Add new site" → "Import an existing project"
   - GitHub Repository verbinden
   - Build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
3. **Fertig!** → Automatisches Deployment bei jedem Push

#### 💰 Kosten:
- **Free Tier**: 100 GB Bandbreite/Monat, 300 Build-Minuten/Monat
- **Pro**: $19/Monat (mehr Bandbreite, mehr Features)

#### 📝 Konfiguration:
Dein Projekt ist bereits konfiguriert:
- ✅ `public/_headers` → Netlify Headers
- ✅ `public/_redirects` → Netlify Redirects
- ✅ Build-Output: `dist/`

---

### Option 2: **Vercel** ⭐

#### ✅ Vorteile:
- ✅ **Kostenlos** für kleine Projekte
- ✅ HTTPS automatisch
- ✅ Sehr schnelle Deployments
- ✅ Edge Functions (optional)

#### 📋 Setup:
1. **Account erstellen**: [vercel.com](https://vercel.com)
2. **Projekt importieren**:
   - GitHub Repository verbinden
   - Framework Preset: **Vite**
   - Build settings automatisch erkannt
3. **Fertig!**

#### 💰 Kosten:
- **Free Tier**: Unbegrenzte Bandbreite, 100 GB/Monat
- **Pro**: $20/Monat

#### 📝 Konfiguration:
Erstelle `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

---

### Option 3: **GitHub Pages** (Kostenlos)

#### ✅ Vorteile:
- ✅ **Komplett kostenlos**
- ✅ HTTPS automatisch
- ✅ Einfache Integration

#### ⚠️ Nachteile:
- ⚠️ Keine Server-Side Redirects (nur Client-Side)
- ⚠️ Langsamere Deployments
- ⚠️ Begrenzte Features

#### 📋 Setup:
1. **Repository Settings** → **Pages**
2. **Source**: `gh-pages` Branch oder `/docs` Ordner
3. **GitHub Actions** für automatisches Deployment

#### 📝 Konfiguration:
Erstelle `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

### Option 4: **Cloudflare Pages** (Kostenlos)

#### ✅ Vorteile:
- ✅ **Kostenlos** mit unbegrenzter Bandbreite
- ✅ Sehr schnelles CDN
- ✅ HTTPS automatisch
- ✅ Edge Functions

#### 📋 Setup:
1. **Account erstellen**: [cloudflare.com](https://cloudflare.com)
2. **Pages** → **Create a project**
3. **GitHub Repository** verbinden
4. **Build settings**:
   - Framework: **Vite**
   - Build command: `npm run build`
   - Build output: `dist`

#### 💰 Kosten:
- **Free Tier**: Unbegrenzte Bandbreite, 500 Builds/Monat

---

### Option 5: **Firebase Hosting** (Google)

#### ✅ Vorteile:
- ✅ **Kostenlos** für kleine Projekte
- ✅ HTTPS automatisch
- ✅ CDN global
- ✅ Integration mit anderen Firebase Services

#### 📋 Setup:
1. **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
2. **Hosting** aktivieren
3. **Firebase CLI** installieren:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```
4. **firebase.json** erstellen:
   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         { "source": "**", "destination": "/index.html" }
       ],
       "headers": [
         {
           "source": "/manifest.webmanifest",
           "headers": [
             { "key": "Content-Type", "value": "application/manifest+json" }
           ]
         }
       ]
     }
   }
   ```

#### 💰 Kosten:
- **Spark Plan**: Kostenlos, 10 GB Storage, 360 MB/Tag Bandbreite

---

## 📊 Vergleichstabelle

| Provider | Kosten | Bandbreite | HTTPS | CI/CD | Empfehlung |
|----------|--------|------------|-------|-------|------------|
| **Netlify** | Free/€19 | 100 GB/Monat | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Vercel** | Free/€20 | Unbegrenzt | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Cloudflare Pages** | Free | Unbegrenzt | ✅ | ✅ | ⭐⭐⭐⭐ |
| **GitHub Pages** | Free | 1 GB/Monat | ✅ | ⚠️ | ⭐⭐⭐ |
| **Firebase** | Free | 360 MB/Tag | ✅ | ✅ | ⭐⭐⭐⭐ |

---

## 🚀 Schnellstart: Netlify (Empfohlen)

### Schritt 1: Account erstellen
1. Gehe zu [app.netlify.com](https://app.netlify.com)
2. "Sign up" → GitHub Account verbinden

### Schritt 2: Site erstellen
1. **"Add new site"** → **"Import an existing project"**
2. **GitHub** auswählen → Repository auswählen
3. **Build settings**:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
4. **"Deploy site"** klicken

### Schritt 3: Domain konfigurieren (optional)
1. **Site settings** → **Domain management**
2. **Add custom domain** (z.B. `ayto-tracker.com`)
3. DNS-Einstellungen folgen
4. HTTPS wird automatisch aktiviert

### Schritt 4: Automatisches Deployment
- ✅ Jeder Push auf `main` Branch → Automatisches Deployment
- ✅ Preview-Deployments für Pull Requests
- ✅ Rollback-Funktion

---

## 🔧 Konfiguration für dein Projekt

### Dein Projekt ist bereits vorbereitet:

#### ✅ `public/_headers` (Netlify)
```
/*
  X-Content-Type-Options: nosniff

/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: public, max-age=3600

/sw.js
  Cache-Control: no-store
```

#### ✅ `public/_redirects` (Netlify)
```
/*    /index.html   200
```

#### ✅ Build-Output: `dist/`
- Wird automatisch von `npm run build` erstellt

---

## 📋 Checkliste vor dem Deployment

### Vor dem ersten Deployment:
- [ ] **HTTPS aktiviert** (automatisch bei allen Providern)
- [ ] **Service Worker** erreichbar unter `/sw.js`
- [ ] **Manifest** erreichbar unter `/manifest.webmanifest`
- [ ] **SPA-Routing** konfiguriert (`/* → /index.html`)
- [ ] **MIME-Types** korrekt (manifest.json, sw.js)
- [ ] **Build erfolgreich** (`npm run build` lokal testen)
- [ ] **Offline-Funktionalität** getestet

### Nach dem Deployment:
- [ ] **Service Worker** registriert (DevTools → Application → Service Workers)
- [ ] **Manifest** geladen (DevTools → Application → Manifest)
- [ ] **Install-Prompt** funktioniert (Android Chrome)
- [ ] **Offline-Modus** getestet
- [ ] **Lighthouse PWA-Score** > 90

---

## 🧪 Testing-Checkliste

### 1. Service Worker Test
```javascript
// In Browser Console:
navigator.serviceWorker.getRegistrations().then(console.log)
```

### 2. Manifest Test
```javascript
// In Browser Console:
fetch('/manifest.webmanifest').then(r => r.json()).then(console.log)
```

### 3. HTTPS Test
- ✅ URL beginnt mit `https://`
- ✅ Keine "Nicht sicher" Warnung
- ✅ SSL-Zertifikat gültig

### 4. Offline Test
1. DevTools → Network → **Offline** aktivieren
2. App sollte weiterhin funktionieren
3. Service Worker Cache sollte aktiv sein

---

## 💡 Best Practices

### 1. **Cache-Strategie**
- ✅ App-Shell: Cache-First (bereits in `sw.js`)
- ✅ Daten: Network-First (für Updates)
- ✅ Assets: Cache mit Versionierung

### 2. **Performance**
- ✅ Code Splitting
- ✅ Lazy Loading
- ✅ Image Optimization
- ✅ Bundle Size < 500KB

### 3. **Updates**
- ✅ Service Worker Auto-Update (bereits konfiguriert)
- ✅ Version-Check beim App-Start
- ✅ Benutzer-Feedback bei Updates

---

## 🆘 Troubleshooting

### Problem: Service Worker registriert nicht
**Lösung:**
- ✅ HTTPS erforderlich (kein HTTP)
- ✅ Service Worker muss im Root (`/sw.js`)
- ✅ Cache-Control: `no-store` für `sw.js`

### Problem: Manifest wird nicht geladen
**Lösung:**
- ✅ MIME-Type: `application/manifest+json`
- ✅ Datei erreichbar unter `/manifest.webmanifest`
- ✅ Cache-Control korrekt

### Problem: SPA-Routing funktioniert nicht
**Lösung:**
- ✅ Redirect-Regel: `/* → /index.html`
- ✅ Provider-spezifische Konfiguration prüfen

### Problem: Offline-Modus funktioniert nicht
**Lösung:**
- ✅ Service Worker registriert?
- ✅ Cache-Strategie korrekt?
- ✅ Assets im Cache?

---

## 📞 Nächste Schritte

1. **Provider wählen**: Netlify empfohlen (bereits vorbereitet)
2. **Account erstellen**: Kostenlos
3. **Deployment durchführen**: 5 Minuten Setup
4. **Testing**: Checkliste durchgehen
5. **Fertig!** 🎉

---

## 🎯 Meine Empfehlung

**Für AYTO-Tracker: Netlify** ⭐

**Gründe:**
- ✅ Dein Projekt ist bereits dafür konfiguriert
- ✅ Kostenlos für kleine Projekte
- ✅ Einfaches Setup (5 Minuten)
- ✅ Automatisches Deployment
- ✅ HTTPS automatisch
- ✅ CDN global

**Alternative:** Vercel (ähnlich, auch sehr gut)

**Nicht empfohlen:** GitHub Pages (zu eingeschränkt für PWA)

---

## 📚 Ressourcen

- [Netlify PWA Guide](https://docs.netlify.com/integrations/frameworks/vite/)
- [Vercel PWA Guide](https://vercel.com/docs/frameworks/vite)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker Best Practices](https://web.dev/service-worker-caching-and-http-caching/)
