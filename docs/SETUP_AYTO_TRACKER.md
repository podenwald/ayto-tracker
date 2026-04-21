# Setup: ayto-tracker.legendforest.de

## 🎯 Ziel: AYTO-Tracker auf Subdomain deployen

**Subdomain:** `ayto-tracker.legendforest.de`  
**Ziel:** PWA funktioniert unter `https://ayto-tracker.legendforest.de/`

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: DNS-Eintrag bei Netcup

#### 1.1 Netcup Kundencenter öffnen
1. Gehe zu [https://www.netcup.de/kundencenter/](https://www.netcup.de/kundencenter/)
2. Logge dich ein

#### 1.2 DNS-Verwaltung öffnen
1. **"Domainverwaltung"** → **"DNS-Verwaltung"**
2. Domain **`legendforest.de`** auswählen
3. **"DNS-Einträge verwalten"** klicken

#### 1.3 A-Record hinzufügen
1. **"Neuer Eintrag"** oder **"+"** klicken
2. Folgende Werte eintragen:
   ```
   Name: ayto-tracker
   Typ: A
   Wert: [IP-Adresse deines VServers]
   TTL: 3600
   Priorität: (leer lassen)
   ```
3. **"Speichern"** klicken

**Wichtig:** 
- **Name:** Nur `ayto-tracker` (ohne Domain!)
- **Wert:** Die öffentliche IP-Adresse deines Netcup VServers
- **TTL:** 3600 Sekunden (1 Stunde) ist Standard

#### 1.4 IP-Adresse deines VServers finden
Falls du die IP nicht kennst:
```bash
# Auf deinem VServer:
curl ifconfig.me
# Oder
hostname -I
```

**Beispiel DNS-Eintrag:**
```
Name: ayto-tracker
Typ: A
Wert: 123.45.67.89
TTL: 3600
```

#### 1.5 DNS-Propagation prüfen
Nach dem Speichern dauert es 5-60 Minuten, bis der DNS-Eintrag weltweit verfügbar ist.

**Prüfen:**
```bash
# Auf deinem lokalen Rechner oder Server:
dig ayto-tracker.legendforest.de
# Oder
nslookup ayto-tracker.legendforest.de
```

**Erfolg:** Die IP-Adresse deines Servers sollte angezeigt werden.

---

### Schritt 2: VServer vorbereiten

#### 2.1 SSH-Verbindung zum Server
```bash
ssh user@deine-server-ip
# Oder
ssh user@legendforest.de
```

#### 2.2 Verzeichnis erstellen
```bash
# Projekt-Verzeichnis erstellen
sudo mkdir -p /var/www/ayto-tracker/dist

# Berechtigungen setzen
sudo chown -R $USER:$USER /var/www/ayto-tracker
chmod -R 755 /var/www/ayto-tracker
```

#### 2.3 Nginx installieren (falls nicht vorhanden)
```bash
sudo apt update
sudo apt install nginx -y
```

**Prüfen:**
```bash
sudo systemctl status nginx
# Sollte "active (running)" zeigen
```

---

### Schritt 3: Nginx-Konfiguration erstellen

#### 3.1 Konfigurationsdatei erstellen
```bash
sudo nano /etc/nginx/sites-available/ayto-tracker.legendforest.de
```

#### 3.2 Folgende Konfiguration einfügen:

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name ayto-tracker.legendforest.de;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ayto-tracker.legendforest.de;

    # SSL-Zertifikat (wird später von Certbot gesetzt)
    # ssl_certificate /etc/letsencrypt/live/ayto-tracker.legendforest.de/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/ayto-tracker.legendforest.de/privkey.pem;
    
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

    # Gzip-Kompression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Manifest (PWA)
    location ~* \.(webmanifest)$ {
        add_header Content-Type application/manifest+json;
        add_header Cache-Control "public, max-age=3600";
    }

    # Service Worker - KEIN Cache!
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

    # Statische Assets (Cache)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # JavaScript & CSS (Cache)
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
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

#### 3.3 Datei speichern
- **Nano:** `Ctrl + O` → Enter → `Ctrl + X`

#### 3.4 Konfiguration aktivieren
```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/ayto-tracker.legendforest.de /etc/nginx/sites-enabled/

# Konfiguration testen
sudo nginx -t
```

**Erfolg:** Sollte "syntax is ok" und "test is successful" zeigen.

#### 3.5 Nginx neu starten
```bash
sudo systemctl restart nginx
```

**Prüfen:**
```bash
sudo systemctl status nginx
# Sollte "active (running)" zeigen
```

---

### Schritt 4: SSL-Zertifikat einrichten (Let's Encrypt)

#### 4.1 Certbot installieren
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 4.2 SSL-Zertifikat erstellen
```bash
sudo certbot --nginx -d ayto-tracker.legendforest.de
```

**Während der Installation:**
1. **E-Mail-Adresse** eingeben (für Erneuerungs-Benachrichtigungen)
2. **AGB akzeptieren** (A)
3. **E-Mail für Newsletter** (optional, N für Nein)
4. **HTTP → HTTPS Redirect** (2 für automatisch)

**Erfolg:** Certbot konfiguriert automatisch Nginx und setzt SSL-Zertifikat.

#### 4.3 Auto-Renewal testen
```bash
# Test-Renewal (trocken)
sudo certbot renew --dry-run
```

**Erfolg:** Sollte "The dry run was successful" zeigen.

#### 4.4 Auto-Renewal aktivieren (bereits aktiv)
Certbot erstellt automatisch einen Cron-Job für Auto-Renewal.

**Prüfen:**
```bash
sudo systemctl status certbot.timer
```

---

### Schritt 5: Projekt hochladen

#### 5.1 Lokal: Build erstellen
**Auf deinem lokalen Rechner:**
```bash
cd /Users/podenwald/AYTO/AYTO-Tracker

# Build erstellen
npm run build
```

**Prüfen:**
```bash
ls -la dist/
# Sollte index.html, sw.js, manifest.webmanifest, etc. zeigen
```

#### 5.2 Auf Server hochladen
**Option A: SCP (Empfohlen)**
```bash
# Von deinem lokalen Rechner:
scp -r dist/* user@deine-server-ip:/var/www/ayto-tracker/dist/
```

**Option B: SFTP (FileZilla, WinSCP, etc.)**
1. SFTP-Client öffnen
2. Verbinden mit Server
3. In `/var/www/ayto-tracker/dist/` navigieren
4. **Inhalt** von `dist/` hochladen (nicht den Ordner selbst!)

#### 5.3 Berechtigungen setzen
```bash
# Auf Server:
sudo chown -R www-data:www-data /var/www/ayto-tracker
sudo chmod -R 755 /var/www/ayto-tracker
```

**Prüfen:**
```bash
ls -la /var/www/ayto-tracker/dist/
# Sollte index.html, sw.js, etc. zeigen
```

---

### Schritt 6: Testen

#### 6.1 Browser-Test
1. Öffne: `https://ayto-tracker.legendforest.de/`
2. **Erwartung:** AYTO-Tracker App lädt

#### 6.2 DevTools prüfen
1. **F12** drücken (DevTools öffnen)
2. **Application** Tab → **Service Workers**
   - ✅ Service Worker sollte registriert sein
3. **Application** Tab → **Manifest**
   - ✅ Manifest sollte geladen sein
4. **Network** Tab
   - ✅ Alle Assets sollten mit 200 OK laden

#### 6.3 PWA-Funktionen testen
- ✅ **Offline-Modus:** DevTools → Network → Offline → App sollte weiterhin funktionieren
- ✅ **Install-Prompt:** (Android Chrome) "Add to Home Screen" sollte erscheinen

#### 6.4 URLs testen
```bash
# Manifest
curl -I https://ayto-tracker.legendforest.de/manifest.webmanifest
# Sollte: Content-Type: application/manifest+json

# Service Worker
curl -I https://ayto-tracker.legendforest.de/sw.js
# Sollte: Content-Type: application/javascript

# JSON
curl -I https://ayto-tracker.legendforest.de/json/index.json
# Sollte: Content-Type: application/json
```

---

## ✅ Checkliste

- [ ] DNS-Eintrag bei Netcup erstellt
- [ ] DNS-Propagation geprüft (`dig ayto-tracker.legendforest.de`)
- [ ] Nginx installiert und läuft
- [ ] Nginx-Konfiguration erstellt
- [ ] Nginx-Konfiguration aktiviert
- [ ] SSL-Zertifikat erstellt (Certbot)
- [ ] Projekt hochgeladen (`dist/` Inhalt)
- [ ] Berechtigungen gesetzt
- [ ] Browser-Test erfolgreich
- [ ] Service Worker registriert
- [ ] Manifest geladen
- [ ] HTTPS funktioniert (grünes Schloss)

---

## 🆘 Troubleshooting

### Problem: DNS löst nicht auf
**Lösung:**
```bash
# DNS prüfen
dig ayto-tracker.legendforest.de
# Falls keine IP: DNS-Eintrag bei Netcup prüfen, TTL abwarten
```

### Problem: 502 Bad Gateway
**Lösung:**
```bash
# Nginx-Logs prüfen
sudo tail -f /var/log/nginx/error.log

# Berechtigungen prüfen
sudo chown -R www-data:www-data /var/www/ayto-tracker
```

### Problem: SSL-Zertifikat funktioniert nicht
**Lösung:**
```bash
# Certbot erneut ausführen
sudo certbot --nginx -d ayto-tracker.legendforest.de --force-renewal
```

### Problem: Service Worker registriert nicht
**Lösung:**
- ✅ HTTPS erforderlich (prüfen: grünes Schloss im Browser)
- ✅ `sw.js` muss erreichbar sein: `https://ayto-tracker.legendforest.de/sw.js`
- ✅ Cache-Control: `no-store` (bereits in Konfiguration)

### Problem: SPA-Routing funktioniert nicht
**Lösung:**
```bash
# Nginx-Konfiguration prüfen
sudo nginx -t

# SPA-Routing sollte enthalten sein:
# location / {
#     try_files $uri $uri/ /index.html;
# }
```

---

## 🔄 Updates hochladen

Bei jedem Update:

```bash
# 1. Lokal: Build erstellen
npm run build

# 2. Auf Server hochladen
scp -r dist/* user@server:/var/www/ayto-tracker/dist/

# 3. Nginx neu laden (optional)
ssh user@server "sudo systemctl reload nginx"
```

---

## 📝 Zusammenfassung

**DNS:** `ayto-tracker` → A-Record → Server-IP  
**Nginx:** Konfiguration für `ayto-tracker.legendforest.de`  
**SSL:** Let's Encrypt via Certbot  
**Projekt:** `dist/` Inhalt nach `/var/www/ayto-tracker/dist/`  
**Ergebnis:** `https://ayto-tracker.legendforest.de/` ✅

---

## 🎉 Fertig!

Wenn alle Schritte abgeschlossen sind, sollte deine PWA unter:
**`https://ayto-tracker.legendforest.de/`** erreichbar sein!

**Hast du Fragen zu einem bestimmten Schritt?** 🤔
