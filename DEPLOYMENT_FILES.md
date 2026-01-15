# Welche Dateien müssen auf den Server?

## ✅ **Nur der `dist/` Ordner!**

Für die PWA musst du **NUR** den `dist/` Ordner hochladen. Das ist der fertige Build-Output.

---

## 📁 Was ist im `dist/` Ordner?

Nach `npm run build` enthält `dist/`:

```
dist/
├── index.html                    # ✅ Haupt-HTML-Datei
├── manifest.webmanifest          # ✅ PWA-Manifest
├── manifest.json                # ✅ Versions-Manifest
├── sw.js                        # ✅ Service Worker
├── registerSW.js                # ✅ Service Worker Registrierung
├── workbox-*.js                 # ✅ Service Worker Cache-Logik
│
├── assets/                      # ✅ Kompilierte JS & CSS
│   ├── index-*.js              # ✅ Haupt-JavaScript
│   └── index-*.css             # ✅ Haupt-CSS
│
├── json/                        # ✅ Daten-Dateien
│   ├── index.json              # ✅ JSON-Index
│   ├── ayto-vip-2024.json      # ✅ Daten 2024
│   └── ayto-vip-2025.json      # ✅ Daten 2025
│
├── pwa-192x192.png             # ✅ App-Icon (klein)
├── pwa-512x512.png             # ✅ App-Icon (groß)
├── apple-touch-icon.png         # ✅ iOS-Icon
├── avatar-female.svg            # ✅ Avatar (weiblich)
├── avatar-male.svg              # ✅ Avatar (männlich)
├── vite.svg                     # ✅ Favicon
│
├── _headers                     # ✅ Netlify-Headers (optional)
└── _redirects                   # ✅ Netlify-Redirects (optional)
```

**Das ist alles!** 🎉

---

## ❌ Was NICHT hochgeladen werden muss

### Source-Code (nicht nötig):
- ❌ `src/` Ordner
- ❌ `public/` Ordner (wird in `dist/` kopiert)
- ❌ `node_modules/` Ordner
- ❌ `package.json` (nur für Build nötig)
- ❌ `vite.config.ts`
- ❌ `tsconfig.json`
- ❌ Alle TypeScript-Dateien (`.ts`, `.tsx`)

### Build-Tools (nicht nötig):
- ❌ `scripts/` Ordner
- ❌ `.git/` Ordner
- ❌ `README.md`, `CHANGELOG.md`, etc.

### Development-Dateien (nicht nötig):
- ❌ `.env` Dateien
- ❌ ESLint-Konfiguration
- ❌ Tailwind-Konfiguration

---

## 🚀 Upload-Methoden

### Methode 1: SCP (Empfohlen)

**Lokal auf deinem Rechner:**
```bash
# 1. Build erstellen
npm run build

# 2. Auf Server hochladen
scp -r dist/* user@dein-server.de:/var/www/ayto-tracker/
```

**Oder komprimiert:**
```bash
# 1. Build erstellen
npm run build

# 2. Komprimieren
cd dist
tar -czf ../ayto-tracker-dist.tar.gz .

# 3. Hochladen
scp ayto-tracker-dist.tar.gz user@dein-server.de:/tmp/

# 4. Auf Server: Entpacken
ssh user@dein-server.de
cd /var/www/ayto-tracker
tar -xzf /tmp/ayto-tracker-dist.tar.gz
```

### Methode 2: SFTP (FileZilla, WinSCP, etc.)

1. **Build erstellen**: `npm run build`
2. **SFTP-Client öffnen** (FileZilla, WinSCP, etc.)
3. **Verbinden** mit deinem Server
4. **Nur `dist/` Ordner** hochladen nach `/var/www/ayto-tracker/`

**Wichtig:** Nur den **Inhalt** von `dist/` hochladen, nicht den `dist/` Ordner selbst!

```
❌ Falsch: /var/www/ayto-tracker/dist/index.html
✅ Richtig: /var/www/ayto-tracker/index.html
```

### Methode 3: Git Clone + Build auf Server

**Auf dem Server:**
```bash
# 1. Repository klonen
cd /var/www
git clone https://github.com/dein-username/ayto-tracker.git
cd ayto-tracker

# 2. Dependencies installieren
npm install

# 3. Build erstellen
npm run build

# 4. Nginx auf dist/ zeigen lassen
# (siehe Nginx-Konfiguration)
```

**Vorteil:** Automatisches Deployment bei `git pull`

---

## 📋 Schritt-für-Schritt Anleitung

### Option A: Lokaler Build + Upload (Empfohlen)

**1. Lokal auf deinem Rechner:**
```bash
# In deinem Projekt-Verzeichnis
cd /Users/podenwald/AYTO/AYTO-Tracker

# Build erstellen
npm run build
```

**2. Prüfen, ob Build erfolgreich:**
```bash
# dist/ Ordner sollte jetzt existieren
ls -la dist/
```

**3. Auf Server hochladen:**
```bash
# Alle Dateien aus dist/ hochladen
scp -r dist/* user@dein-server.de:/var/www/ayto-tracker/
```

**4. Auf Server: Berechtigungen setzen:**
```bash
ssh user@dein-server.de
sudo chown -R www-data:www-data /var/www/ayto-tracker
sudo chmod -R 755 /var/www/ayto-tracker
```

**5. Nginx neu laden:**
```bash
sudo systemctl reload nginx
```

### Option B: Build auf Server

**1. Projekt auf Server hochladen (komplett):**
```bash
# Repository klonen oder Source hochladen
cd /var/www
git clone https://github.com/dein-username/ayto-tracker.git
# ODER: scp -r /lokaler/pfad user@server:/var/www/ayto-tracker
```

**2. Auf Server: Build erstellen:**
```bash
cd /var/www/ayto-tracker
npm install
npm run build
```

**3. Nginx auf dist/ zeigen lassen:**
```nginx
root /var/www/ayto-tracker/dist;
```

---

## 🔍 Verzeichnisstruktur auf Server

### Nach dem Upload sollte es so aussehen:

```
/var/www/ayto-tracker/
├── index.html                    # ✅
├── manifest.webmanifest          # ✅
├── manifest.json                 # ✅
├── sw.js                         # ✅
├── registerSW.js                 # ✅
├── workbox-*.js                  # ✅
├── assets/                       # ✅
│   ├── index-*.js
│   └── index-*.css
├── json/                         # ✅
│   ├── index.json
│   ├── ayto-vip-2024.json
│   └── ayto-vip-2025.json
├── pwa-192x192.png              # ✅
├── pwa-512x512.png              # ✅
└── ... (weitere Assets)
```

**NICHT so:**
```
/var/www/ayto-tracker/
└── dist/                         # ❌ Falsch!
    ├── index.html
    └── ...
```

---

## ✅ Checkliste vor dem Upload

- [ ] **Build erfolgreich**: `npm run build` ohne Fehler
- [ ] **dist/ Ordner existiert**: `ls dist/` zeigt Dateien
- [ ] **index.html vorhanden**: `ls dist/index.html`
- [ ] **sw.js vorhanden**: `ls dist/sw.js`
- [ ] **manifest.webmanifest vorhanden**: `ls dist/manifest.webmanifest`
- [ ] **JSON-Dateien vorhanden**: `ls dist/json/`

---

## 🧪 Nach dem Upload testen

### 1. Dateien prüfen
```bash
# Auf Server
ls -la /var/www/ayto-tracker/
ls -la /var/www/ayto-tracker/json/
```

### 2. Browser-Test
- ✅ `https://deine-domain.de/` → App lädt
- ✅ `https://deine-domain.de/manifest.webmanifest` → Manifest lädt
- ✅ `https://deine-domain.de/sw.js` → Service Worker lädt
- ✅ `https://deine-domain.de/json/index.json` → JSON lädt

### 3. DevTools prüfen
- ✅ **Application → Service Workers**: Service Worker registriert
- ✅ **Application → Manifest**: Manifest geladen
- ✅ **Network**: Alle Assets laden (200 OK)

---

## 🔄 Updates hochladen

### Bei jedem Update:

**1. Lokal:**
```bash
npm run build
```

**2. Upload:**
```bash
# Alte Dateien überschreiben
scp -r dist/* user@server:/var/www/ayto-tracker/
```

**3. Service Worker Cache leeren:**
- Browser: DevTools → Application → Service Workers → Unregister
- Oder: Service Worker Version erhöhen (automatisch bei Build)

---

## 💡 Tipps

### 1. Nur geänderte Dateien hochladen
```bash
# Mit rsync (nur Änderungen)
rsync -avz --delete dist/ user@server:/var/www/ayto-tracker/
```

### 2. Backup vor Update
```bash
# Auf Server: Backup erstellen
ssh user@server
cd /var/www
sudo cp -r ayto-tracker ayto-tracker-backup-$(date +%Y%m%d)
```

### 3. Automatisches Deployment
Siehe `VSERVER_HOSTING_GUIDE.md` → GitHub Actions Setup

---

## 🆘 Troubleshooting

### Problem: Dateien fehlen nach Upload
**Lösung:**
```bash
# Prüfen, ob alle Dateien hochgeladen wurden
ls -la /var/www/ayto-tracker/
# Sollte index.html, sw.js, etc. zeigen
```

### Problem: Service Worker lädt nicht
**Lösung:**
```bash
# Prüfen, ob sw.js existiert
ls -la /var/www/ayto-tracker/sw.js
# Prüfen Berechtigungen
sudo chmod 644 /var/www/ayto-tracker/sw.js
```

### Problem: JSON-Dateien fehlen
**Lösung:**
```bash
# Prüfen json/ Ordner
ls -la /var/www/ayto-tracker/json/
# Falls leer: dist/json/ nochmal hochladen
scp -r dist/json/* user@server:/var/www/ayto-tracker/json/
```

---

## 📝 Zusammenfassung

**Was hochladen:**
- ✅ **NUR** der `dist/` Ordner (Inhalt, nicht der Ordner selbst)

**Was NICHT hochladen:**
- ❌ Source-Code (`src/`, `public/`, etc.)
- ❌ `node_modules/`
- ❌ Build-Konfigurationen
- ❌ Development-Dateien

**Upload-Methode:**
1. Lokal: `npm run build`
2. Upload: `scp -r dist/* user@server:/var/www/ayto-tracker/`
3. Fertig! 🎉
