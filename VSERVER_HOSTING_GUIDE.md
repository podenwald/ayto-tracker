# PWA Hosting auf Netcup VServer - Anleitung

## ✅ Ja, das funktioniert perfekt!

Ein eigener VServer gibt dir **volle Kontrolle** und ist oft **kostengünstiger** als Hosting-Services. Du brauchst nur einen Webserver (Nginx oder Apache) mit HTTPS.

---

## 📋 Voraussetzungen

### Was du brauchst:
- ✅ Netcup VServer (Linux)
- ✅ Root-Zugriff (SSH)
- ✅ Domain oder Subdomain (für HTTPS)
- ✅ Grundkenntnisse in Linux/SSH

### Was installiert werden muss:
- ✅ Webserver (Nginx **empfohlen** oder Apache)
- ✅ SSL-Zertifikat (Let's Encrypt - kostenlos)
- ✅ Node.js (nur für Build, optional)

---

## 🚀 Option A: Nginx Setup (Empfohlen)

### Schritt 1: Nginx installieren

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### Schritt 2: Projekt auf Server hochladen

**Option A: Git Clone (Empfohlen)**
```bash
cd /var/www
sudo git clone https://github.com/dein-username/ayto-tracker.git
cd ayto-tracker
sudo npm install
sudo npm run build
```

**Option B: SCP/SFTP Upload**
```bash
# Lokal auf deinem Rechner:
npm run build
scp -r dist/* user@dein-server.de:/var/www/ayto-tracker/
```

### Schritt 3: Nginx-Konfiguration erstellen

Erstelle `/etc/nginx/sites-available/ayto-tracker`:

```nginx
server {
    listen 80;
    server_name ayto-tracker.dein-domain.de;
    
    # Root-Verzeichnis (wo dein Build liegt)
    root /var/www/ayto-tracker/dist;
    index index.html;

    # Gzip-Kompression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # MIME-Types für PWA
    location ~* \.(webmanifest)$ {
        add_header Content-Type application/manifest+json;
        add_header Cache-Control "public, max-age=3600";
    }

    # Service Worker - KEIN Cache!
    location = /sw.js {
        add_header Content-Type application/javascript;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # JSON-Dateien
    location /json/ {
        add_header Content-Type application/json;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }

    # Statische Assets (Cache)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # JavaScript & CSS (Cache mit Versionierung)
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA-Routing: Alle Routes auf index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Schritt 4: Nginx-Konfiguration aktivieren

```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/ayto-tracker /etc/nginx/sites-enabled/

# Konfiguration testen
sudo nginx -t

# Nginx neu starten
sudo systemctl restart nginx
```

### Schritt 5: HTTPS mit Let's Encrypt einrichten

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# SSL-Zertifikat erstellen (automatisch konfiguriert)
sudo certbot --nginx -d ayto-tracker.dein-domain.de

# Auto-Renewal testen
sudo certbot renew --dry-run
```

**Fertig!** Deine PWA läuft jetzt über HTTPS.

---

## 🚀 Option B: Apache Setup

### Schritt 1: Apache installieren

```bash
sudo apt update
sudo apt install apache2
```

### Schritt 2: Apache-Konfiguration erstellen

Erstelle `/etc/apache2/sites-available/ayto-tracker.conf`:

```apache
<VirtualHost *:80>
    ServerName ayto-tracker.dein-domain.de
    DocumentRoot /var/www/ayto-tracker/dist

    # MIME-Types für PWA
    <FilesMatch "\.webmanifest$">
        Header set Content-Type "application/manifest+json"
        Header set Cache-Control "public, max-age=3600"
    </FilesMatch>

    # Service Worker - KEIN Cache!
    <FilesMatch "^sw\.js$">
        Header set Content-Type "application/javascript"
        Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>

    # JSON-Dateien
    <Directory "/var/www/ayto-tracker/dist/json">
        Header set Content-Type "application/json"
        Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
    </Directory>

    # SPA-Routing
    <Directory "/var/www/ayto-tracker/dist">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Security Headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>
```

### Schritt 3: Apache-Module aktivieren

```bash
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2ensite ayto-tracker
sudo systemctl restart apache2
```

### Schritt 4: HTTPS mit Let's Encrypt

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d ayto-tracker.dein-domain.de
```

---

## 🔄 Automatisches Deployment

### Option 1: GitHub Actions + SSH

Erstelle `.github/workflows/deploy-vserver.yml`:

```yaml
name: Deploy to VServer

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to VServer
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.VSERVER_HOST }}
          username: ${{ secrets.VSERVER_USER }}
          key: ${{ secrets.VSERVER_SSH_KEY }}
          source: "dist/*"
          target: "/var/www/ayto-tracker/dist"
      
      - name: Restart Nginx
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VSERVER_HOST }}
          username: ${{ secrets.VSERVER_USER }}
          key: ${{ secrets.VSERVER_SSH_KEY }}
          script: sudo systemctl reload nginx
```

**GitHub Secrets konfigurieren:**
- `VSERVER_HOST`: Deine Server-IP oder Domain
- `VSERVER_USER`: SSH-Username
- `VSERVER_SSH_KEY`: Private SSH-Key

### Option 2: Lokaler Build + SCP

```bash
# Lokal auf deinem Rechner:
npm run build

# Auf Server hochladen:
scp -r dist/* user@dein-server.de:/var/www/ayto-tracker/dist/

# Auf Server: Nginx neu laden
ssh user@dein-server.de "sudo systemctl reload nginx"
```

### Option 3: Git Hook (auf Server)

Auf dem Server:

```bash
cd /var/www/ayto-tracker
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

---

## 📁 Verzeichnisstruktur

```
/var/www/ayto-tracker/
├── dist/                    # Build-Output (wird deployed)
│   ├── index.html
│   ├── assets/
│   ├── sw.js
│   ├── manifest.webmanifest
│   └── json/
├── .git/                    # Git Repository (optional)
├── package.json
└── src/                     # Source Code (optional auf Server)
```

**Empfehlung:**
- ✅ Source Code lokal entwickeln
- ✅ Build lokal oder via CI/CD
- ✅ Nur `dist/` auf Server hochladen

---

## 🔒 Sicherheit

### 1. Firewall konfigurieren

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

### 2. SSH-Hardening

```bash
# SSH-Konfiguration: /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

### 3. Automatische Updates

```bash
# Unattended-Upgrades (Ubuntu)
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🧪 Testing-Checkliste

Nach dem Setup testen:

- [ ] **HTTPS funktioniert**: `https://ayto-tracker.dein-domain.de`
- [ ] **Service Worker**: DevTools → Application → Service Workers
- [ ] **Manifest**: DevTools → Application → Manifest
- [ ] **SPA-Routing**: Direkte URL aufrufen (z.B. `/admin`)
- [ ] **Offline-Modus**: DevTools → Network → Offline
- [ ] **MIME-Types**: `curl -I https://.../manifest.webmanifest`

---

## 🔧 Troubleshooting

### Problem: Service Worker registriert nicht
**Lösung:**
```nginx
# In Nginx-Konfiguration:
location = /sw.js {
    add_header Cache-Control "no-store";
}
```

### Problem: SPA-Routing funktioniert nicht
**Lösung:**
```nginx
# Nginx:
location / {
    try_files $uri $uri/ /index.html;
}
```

### Problem: MIME-Type falsch
**Lösung:**
```nginx
# Nginx:
location ~* \.(webmanifest)$ {
    add_header Content-Type application/manifest+json;
}
```

### Problem: SSL-Zertifikat erneuern
**Lösung:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 💰 Kosten-Vergleich

| Option | Kosten/Monat | Bandbreite | Kontrolle |
|--------|--------------|------------|-----------|
| **Netcup VServer** | ~€5-15 | Unbegrenzt* | ✅ Voll |
| **Netlify** | Free/€19 | 100 GB | ⚠️ Begrenzt |
| **Vercel** | Free/€20 | Unbegrenzt | ⚠️ Begrenzt |

*Abhängig von deinem VServer-Tarif

---

## 🎯 Vorteile VServer

✅ **Vollständige Kontrolle**
- Eigene Konfiguration
- Keine Limits (außer Server-Ressourcen)
- Eigene Domain

✅ **Kosten**
- Oft günstiger bei größerem Traffic
- Keine versteckten Kosten
- Vorhersehbare Preise

✅ **Flexibilität**
- Mehrere Projekte auf einem Server
- Eigene Tools installieren
- Custom-Konfigurationen

---

## 📝 Nginx-Konfiguration (Vollständig)

Hier ist eine vollständige, produktionsreife Nginx-Konfiguration:

```nginx
# /etc/nginx/sites-available/ayto-tracker

# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name ayto-tracker.dein-domain.de;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ayto-tracker.dein-domain.de;

    # SSL-Zertifikat (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/ayto-tracker.dein-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ayto-tracker.dein-domain.de/privkey.pem;
    
    # SSL-Optimierungen
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root-Verzeichnis
    root /var/www/ayto-tracker/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/ayto-tracker-access.log;
    error_log /var/log/nginx/ayto-tracker-error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Manifest
    location ~* \.(webmanifest)$ {
        add_header Content-Type application/manifest+json;
        add_header Cache-Control "public, max-age=3600";
    }

    # Service Worker
    location = /sw.js {
        add_header Content-Type application/javascript;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # JSON-Dateien
    location /json/ {
        add_header Content-Type application/json;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }

    # Statische Assets
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # JS & CSS
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA-Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

---

## 🚀 Quick Start (5 Minuten)

```bash
# 1. Nginx installieren
sudo apt update && sudo apt install nginx

# 2. Projekt hochladen
cd /var/www
sudo git clone https://github.com/dein-username/ayto-tracker.git
cd ayto-tracker
sudo npm install && sudo npm run build

# 3. Nginx-Konfiguration (siehe oben)
sudo nano /etc/nginx/sites-available/ayto-tracker
# → Konfiguration einfügen

# 4. Aktivieren
sudo ln -s /etc/nginx/sites-available/ayto-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 5. HTTPS
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ayto-tracker.dein-domain.de

# Fertig! 🎉
```

---

## 📞 Nächste Schritte

1. **Nginx installieren** (falls nicht vorhanden)
2. **Projekt auf Server hochladen**
3. **Nginx-Konfiguration erstellen** (siehe oben)
4. **HTTPS einrichten** (Let's Encrypt)
5. **Testen** (Checkliste durchgehen)

**Brauchst du Hilfe bei einem bestimmten Schritt?** 🤔
