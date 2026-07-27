# Hosting-Alternativen (verworfen)

> **Nicht das tatsächliche Setup.** Dieses Dokument fasst zwei frühere Guides zusammen
> (`VSERVER_HOSTING_GUIDE.md`, `PWA_HOSTING_GUIDE.md`), die vor der finalen Entscheidung
> verschiedene Hosting-Optionen abgewogen haben. Tatsächlich im Einsatz ist **Netcup
> Shared-Hosting**, automatisiert per FTP über GitHub Actions deployed - siehe
> **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**, die alleinige Quelle der Wahrheit für den
> laufenden Deployment-Prozess. Weder ein eigener Root-VServer mit Nginx/Apache (Option A
> unten) noch ein Managed-Provider wie Netlify (Option B unten) kommt zum Einsatz.
>
> Dieses Dokument bleibt als generische technische Referenz erhalten, falls einer dieser
> Wege später doch einmal relevant wird (z. B. Umzug auf einen echten VServer oder einen
> anderen Provider). Für den aktuellen Betrieb ist es **nicht** anzuwenden.

---

## Option A: Eigener Root-VServer (Nginx/Apache)

Ein eigener VServer gibt volle Kontrolle über den Webserver und ist bei größerem Traffic
oft günstiger als Managed-Hosting. Voraussetzung ist Root-/SSH-Zugriff und Grundkenntnisse
in Linux-Administration.

### Voraussetzungen

- Root-Zugriff (SSH) auf einen Linux-VServer
- Domain oder Subdomain für HTTPS
- Webserver (Nginx empfohlen, Apache alternativ)
- SSL-Zertifikat (Let's Encrypt, kostenlos)

### Nginx-Setup

**Schritt 1: Nginx installieren**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

**Schritt 2: Projekt auf den Server bringen**

```bash
# Variante Git Clone
cd /var/www
sudo git clone https://github.com/dein-username/ayto-tracker.git
cd ayto-tracker
sudo npm install
sudo npm run build

# Variante SCP-Upload (lokal gebaut)
npm run build
scp -r dist/* user@dein-server.de:/var/www/ayto-tracker/
```

**Schritt 3: Nginx-Konfiguration** (`/etc/nginx/sites-available/ayto-tracker`)

```nginx
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

    ssl_certificate /etc/letsencrypt/live/ayto-tracker.dein-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ayto-tracker.dein-domain.de/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /var/www/ayto-tracker/dist;
    index index.html;

    access_log /var/log/nginx/ayto-tracker-access.log;
    error_log /var/log/nginx/ayto-tracker-error.log;

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

    # JS & CSS (Cache mit Versionierung)
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA-Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

**Schritt 4: Aktivieren**

```bash
sudo ln -s /etc/nginx/sites-available/ayto-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Schritt 5: HTTPS mit Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ayto-tracker.dein-domain.de
sudo certbot renew --dry-run
```

### Apache-Setup (Alternative)

`/etc/apache2/sites-available/ayto-tracker.conf`:

```apache
<VirtualHost *:80>
    ServerName ayto-tracker.dein-domain.de
    DocumentRoot /var/www/ayto-tracker/dist

    <FilesMatch "\.webmanifest$">
        Header set Content-Type "application/manifest+json"
        Header set Cache-Control "public, max-age=3600"
    </FilesMatch>

    <FilesMatch "^sw\.js$">
        Header set Content-Type "application/javascript"
        Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>

    <Directory "/var/www/ayto-tracker/dist/json">
        Header set Content-Type "application/json"
        Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
    </Directory>

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

    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>
```

```bash
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2ensite ayto-tracker
sudo systemctl restart apache2

sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d ayto-tracker.dein-domain.de
```

### Automatisches Deployment (hypothetisch, nicht im Einsatz)

Falls dieser Weg gewählt würde, könnte ein Deploy per SSH/SCP statt des tatsächlich
genutzten FTP-Deploys erfolgen - z. B. via `.github/workflows/deploy-vserver.yml`:

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

Oder als Git-Hook direkt auf dem Server:

```bash
cd /var/www/ayto-tracker
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

### Sicherheit

```bash
# Firewall (UFW, Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

```
# SSH-Hardening: /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
# Automatische Updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Troubleshooting

| Problem | Lösung |
|---|---|
| Service Worker registriert nicht | `location = /sw.js { add_header Cache-Control "no-store"; }` |
| SPA-Routing funktioniert nicht | `location / { try_files $uri $uri/ /index.html; }` |
| MIME-Type falsch | `location ~* \.(webmanifest)$ { add_header Content-Type application/manifest+json; }` |
| SSL-Zertifikat erneuern | `sudo certbot renew && sudo systemctl reload nginx` |

### Kosten-Vergleich (Stand der ursprünglichen Abwägung)

| Option | Kosten/Monat | Bandbreite | Kontrolle |
|--------|--------------|------------|-----------|
| Netcup VServer | ~€5-15 | Unbegrenzt* | Voll |
| Netlify | Free/€19 | 100 GB | Begrenzt |
| Vercel | Free/€20 | Unbegrenzt | Begrenzt |

*Abhängig vom VServer-Tarif

---

## Option B: Managed PWA-Hosting-Provider

### Technische Mindestanforderungen (providerunabhängig)

- **HTTPS ist Pflicht**: Service Worker funktioniert nur über HTTPS (Ausnahme: `localhost`)
- **Korrekte MIME-Types**: `manifest.webmanifest` → `application/manifest+json`, `sw.js` → `application/javascript`
- **SPA-Routing**: alle Routes auf `index.html` umleiten
- **Service Worker** muss im Root (`/sw.js`) erreichbar sein, mit `Cache-Control: no-store`

Das Repo enthält weiterhin `public/_headers` und `public/_redirects` für Netlify - diese
werden im aktuellen FTP-Deploy nicht ausgewertet, könnten aber bei einem Umstieg auf
Netlify direkt weiterverwendet werden.

### Netlify

1. Account auf [netlify.com](https://netlify.com) erstellen
2. "Add new site" → "Import an existing project" → GitHub-Repo verbinden
3. Build command: `npm run build`, Publish directory: `dist`
4. Automatisches Deployment bei jedem Push auf `main`, inkl. Preview-Deployments für PRs

Kosten: Free Tier 100 GB Bandbreite/Monat, 300 Build-Minuten/Monat; Pro ab $19/Monat.

### Vercel

1. Account auf [vercel.com](https://vercel.com) erstellen
2. Projekt importieren, Framework Preset "Vite" (wird meist automatisch erkannt)
3. Optional `vercel.json`:

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

Kosten: Free Tier unbegrenzte Bandbreite, 100 GB/Monat; Pro ab $20/Monat.

### GitHub Pages

Kostenlos, aber keine serverseitigen Redirects und begrenztere Features - für eine PWA mit
SPA-Routing nur mit Einschränkungen geeignet.

```yaml
# .github/workflows/deploy.yml
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

### Cloudflare Pages

Kostenlos mit unbegrenzter Bandbreite und schnellem CDN. Setup über "Pages" → "Create a
project" → GitHub-Repo verbinden, Framework "Vite", Build command `npm run build`, Build
output `dist`.

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

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

Kosten: Spark Plan kostenlos, 10 GB Storage, 360 MB/Tag Bandbreite.

### Vergleichstabelle

| Provider | Kosten | Bandbreite | HTTPS | CI/CD |
|----------|--------|------------|-------|-------|
| Netlify | Free/€19 | 100 GB/Monat | ✅ | ✅ |
| Vercel | Free/€20 | Unbegrenzt | ✅ | ✅ |
| Cloudflare Pages | Free | Unbegrenzt | ✅ | ✅ |
| GitHub Pages | Free | 1 GB/Monat | ✅ | eingeschränkt |
| Firebase | Free | 360 MB/Tag | ✅ | ✅ |

### Checkliste vor einem Umstieg

- [ ] HTTPS aktiv
- [ ] Service Worker erreichbar unter `/sw.js`
- [ ] Manifest erreichbar unter `/manifest.webmanifest`
- [ ] SPA-Routing konfiguriert (`/* → /index.html`)
- [ ] MIME-Types korrekt
- [ ] `npm run build` lokal erfolgreich
- [ ] Offline-Funktionalität getestet

### Troubleshooting

| Problem | Lösung |
|---|---|
| Service Worker registriert nicht | HTTPS erforderlich, Datei muss unter `/sw.js` liegen, `Cache-Control: no-store` |
| Manifest wird nicht geladen | MIME-Type `application/manifest+json`, erreichbar unter `/manifest.webmanifest` |
| SPA-Routing funktioniert nicht | Redirect-Regel `/* → /index.html`, Provider-spezifisch konfigurieren |
| Offline-Modus funktioniert nicht | Service-Worker-Registrierung und Cache-Strategie prüfen |

---

## Zusammenfassung

Beide Optionen bleiben rein informativ. Für den tatsächlichen Deployment-Prozess,
Troubleshooting und Monitoring gilt ausschließlich **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.
