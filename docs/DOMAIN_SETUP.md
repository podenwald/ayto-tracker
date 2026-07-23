# Domain-Setup: legendforest.de

> **Umgesetzt:** Subdomain-Variante (Option 1), tatsächliche URL ist `ayto-tracker.legendforest.de` (nicht `tracker.legendforest.de`, wie unten als Beispiel verwendet). Der laufende Deploy erfolgt automatisiert per FTP über GitHub Actions, siehe `docs/DEPLOYMENT.md` - die Nginx/SSH-Schritte unten beschreiben die einmalige Server-Einrichtung.

## ✅ Domain verfügbar: https://legendforest.de/

Du hast bereits eine funktionierende Domain! Jetzt gibt es zwei Optionen:

---

## 🎯 Option 1: Subdomain verwenden (Empfohlen)

### Vorteile:
- ✅ Haupt-Website bleibt unverändert
- ✅ Klare Trennung (tracker.legendforest.de)
- ✅ Einfacheres Management

### Setup:
1. **Subdomain erstellen** (z.B. `tracker.legendforest.de`)
2. **DNS-Eintrag** bei Netcup hinzufügen:
   ```
   Typ: A
   Name: tracker
   Wert: [IP-Adresse deines VServers]
   TTL: 3600
   ```

3. **Nginx-Konfiguration** für Subdomain:
   ```nginx
   server {
       listen 80;
       server_name tracker.legendforest.de;
       
       location / {
           return 301 https://$server_name$request_uri;
       }
   }

   server {
       listen 443 ssl http2;
       server_name tracker.legendforest.de;

       ssl_certificate /etc/letsencrypt/live/tracker.legendforest.de/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/tracker.legendforest.de/privkey.pem;

       root /var/www/ayto-tracker/dist;
       index index.html;

       # ... (Rest der Konfiguration siehe VSERVER_HOSTING_GUIDE.md)
   }
   ```

4. **SSL-Zertifikat** für Subdomain:
   ```bash
   sudo certbot --nginx -d tracker.legendforest.de
   ```

**Ergebnis:** `https://tracker.legendforest.de/` → AYTO-Tracker

---

## 🎯 Option 2: Hauptdomain verwenden

### Wenn die Haupt-Website nicht mehr benötigt wird:

1. **Nginx-Konfiguration** für Hauptdomain:
   ```nginx
   server {
       listen 80;
       server_name legendforest.de www.legendforest.de;
       
       location / {
           return 301 https://$server_name$request_uri;
       }
   }

   server {
       listen 443 ssl http2;
       server_name legendforest.de www.legendforest.de;

       ssl_certificate /etc/letsencrypt/live/legendforest.de/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/legendforest.de/privkey.pem;

       root /var/www/ayto-tracker/dist;
       index index.html;

       # ... (Rest der Konfiguration)
   }
   ```

**Ergebnis:** `https://legendforest.de/` → AYTO-Tracker

---

## 🔧 Schnellstart: Subdomain Setup

### Schritt 1: DNS-Eintrag bei Netcup

1. **Netcup Kundencenter** öffnen
2. **DNS-Verwaltung** → Domain `legendforest.de`
3. **Neuen A-Record** hinzufügen:
   ```
   Name: tracker
   Typ: A
   Wert: [IP deines VServers]
   TTL: 3600
   ```

### Schritt 2: Auf Server - Nginx konfigurieren

```bash
# Nginx-Konfiguration erstellen
sudo nano /etc/nginx/sites-available/tracker.legendforest.de
```

**Inhalt:**
```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name tracker.legendforest.de;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name tracker.legendforest.de;

    # SSL wird später von Certbot gesetzt
    # ssl_certificate /etc/letsencrypt/live/tracker.legendforest.de/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/tracker.legendforest.de/privkey.pem;

    root /var/www/ayto-tracker/dist;
    index index.html;

    # Manifest
    location ~* \.(webmanifest)$ {
        add_header Content-Type application/manifest+json;
        add_header Cache-Control "public, max-age=3600";
    }

    # Service Worker
    location = /sw.js {
        add_header Content-Type application/javascript;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }

    # JSON-Dateien
    location /json/ {
        add_header Content-Type application/json;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }

    # SPA-Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
}
```

### Schritt 3: Nginx aktivieren

```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/tracker.legendforest.de /etc/nginx/sites-enabled/

# Testen
sudo nginx -t

# Nginx neu starten
sudo systemctl restart nginx
```

### Schritt 4: SSL-Zertifikat

```bash
# Certbot installieren (falls nicht vorhanden)
sudo apt install certbot python3-certbot-nginx

# SSL-Zertifikat erstellen
sudo certbot --nginx -d tracker.legendforest.de

# Auto-Renewal testen
sudo certbot renew --dry-run
```

### Schritt 5: Projekt hochladen

```bash
# Lokal: Build erstellen
npm run build

# Auf Server hochladen
scp -r dist/* user@dein-server.de:/var/www/ayto-tracker/dist/

# Berechtigungen setzen
ssh user@dein-server.de
sudo chown -R www-data:www-data /var/www/ayto-tracker
sudo chmod -R 755 /var/www/ayto-tracker
```

**Fertig!** 🎉 → `https://tracker.legendforest.de/`

---

## 🧪 Testing

### DNS prüfen:
```bash
# DNS-Propagation prüfen
dig tracker.legendforest.de
# Oder
nslookup tracker.legendforest.de
```

### Browser-Test:
- ✅ `https://tracker.legendforest.de/` → App lädt
- ✅ `https://tracker.legendforest.de/manifest.webmanifest` → Manifest
- ✅ `https://tracker.legendforest.de/sw.js` → Service Worker

### DevTools prüfen:
- ✅ Service Worker registriert
- ✅ Manifest geladen
- ✅ HTTPS aktiv (grünes Schloss)

---

## 🔄 Wenn Hauptdomain verwendet werden soll

Falls du die Hauptdomain `legendforest.de` für die PWA verwenden möchtest:

1. **Bestehende Website sichern** (falls vorhanden)
2. **Nginx-Konfiguration** anpassen (siehe Option 2 oben)
3. **SSL-Zertifikat** erneuern:
   ```bash
   sudo certbot --nginx -d legendforest.de -d www.legendforest.de
   ```

---

## 📝 Nginx-Konfiguration (Vollständig)

Für `tracker.legendforest.de`:

```nginx
# /etc/nginx/sites-available/tracker.legendforest.de

# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name tracker.legendforest.de;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tracker.legendforest.de;

    # SSL-Zertifikat (wird von Certbot gesetzt)
    ssl_certificate /etc/letsencrypt/live/tracker.legendforest.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tracker.legendforest.de/privkey.pem;
    
    # SSL-Optimierungen
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root-Verzeichnis
    root /var/www/ayto-tracker/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/tracker-access.log;
    error_log /var/log/nginx/tracker-error.log;

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

## 🆘 Troubleshooting

### Problem: DNS löst nicht auf
**Lösung:**
- DNS-Eintrag bei Netcup prüfen
- TTL abwarten (bis zu 24h, meist 1-2h)
- DNS-Cache leeren: `sudo systemd-resolve --flush-caches`

### Problem: SSL-Zertifikat funktioniert nicht
**Lösung:**
```bash
# Certbot erneut ausführen
sudo certbot --nginx -d tracker.legendforest.de --force-renewal
```

### Problem: 502 Bad Gateway
**Lösung:**
```bash
# Nginx-Logs prüfen
sudo tail -f /var/log/nginx/error.log

# Berechtigungen prüfen
sudo chown -R www-data:www-data /var/www/ayto-tracker
```

---

## 📞 Nächste Schritte

1. **Entscheiden**: Subdomain oder Hauptdomain?
2. **DNS konfigurieren** (bei Netcup)
3. **Nginx konfigurieren** (auf Server)
4. **SSL einrichten** (Certbot)
5. **Projekt hochladen** (siehe DEPLOYMENT_FILES.md)
6. **Testen** ✅

**Welche Option möchtest du verwenden?** 🤔
