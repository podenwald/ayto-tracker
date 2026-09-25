# Was ist neu?

Diese Liste zeigt dir in einfachen Worten, was sich in AYTO-Tracker geändert hat. Technische Details zu jeder Änderung findest du im Quellcode auf GitHub.

## [1.13.0] - 2026-09-25
- Aktueller Stand der Staffel aktualisiert (Matching Night #6, neue Matchbox Michelle & Raúl)

---

## [1.12.0] - 2026-09-19
- Neu: Sobald nur noch wenige (50 oder weniger) mögliche Lösungen für die Staffel übrig sind, kannst du dir jetzt per Klick auf "Alle N exakten Kombinationen anzeigen" jede einzelne davon komplett ansehen – nicht nur die Prozentwerte pro Paar

---

## [1.11.0] - 2026-09-19
- Neu: Die Wahrscheinlichkeits-Ergebnisse gibt es jetzt auch als "Radar"-Ansicht (Umschalter oben) – zeigt dir auf einen Blick die aktuell heißesten offenen Matches und pro Person die Top 3 wahrscheinlichsten Kandidat*innen, statt nur die große Tabelle

---

## [1.10.1] - 2026-09-18
- Wichtiger Fehler behoben: Die Wahrscheinlichkeits-Berechnung konnte durch den Doppelmatch (Johannes/Marta/Janice) ein Paar fälschlich als "100% sicher" anzeigen, obwohl es das nicht war. Die Berechnung ist jetzt wieder korrekt

---

## [1.10.0] - 2026-09-18
- Wichtiger Fehler behoben: Die Wahrscheinlichkeits-Berechnung zeigte "0 gültige Kombinationen", wenn jemand ohne Perfect Match mal eine Matching Night ausgesetzt hat. Das ist jetzt korrigiert
- Aktueller Stand der Staffel aktualisiert (Matching Nights #4 und #5, neue Matchboxes)
- Neue Standardfarben für die Übersicht

---

## [1.9.5] - 2026-09-09
- Wichtiger Fehler behoben: Im Admin-Bereich ließ sich ein bereits eingetragener Doppelmatch nicht mehr bearbeiten, wenn die Staffel eine gerade Anzahl Frauen/Männer hatte. Das funktioniert jetzt wieder

---

## [1.9.4] - 2026-09-07
- "Deine Lösung": Beim Klicken durch eine Zelle kommt jetzt zuerst "Kein Match" (X), dann "Perfect Match" (Häkchen), dann "Unsicher" – spart dir einen Klick, wenn du meistens X einträgst

---

## [1.9.3] - 2026-09-07
- Die Avatare in "Deine Lösung" und der Wahrscheinlichkeits-Matrix sind jetzt farbig gefüllt (wie in der Übersicht), statt nur einen Rahmen zu haben
- "Deine Lösung": Die Namensspalte links ist jetzt schmaler und passt sich der Namenslänge an

---

## [1.9.2] - 2026-09-06
- Wahrscheinlichkeits-Tab: Wenn noch keine Matching Night eingetragen ist, siehst du jetzt einen ruhigen Hinweis statt einer roten Fehlermeldung – inklusive klarem Hinweis, dass du die Berechnung danach über den Button "Berechnen" manuell starten musst
- Neuer Kandidat im Cast: Laurenz ist dazugekommen
- Der Lade-Bildschirm beim Start und die Fehlermeldung, falls die Daten nicht geladen werden können, sehen jetzt einheitlich aus wie der Rest der App
- "Deine Lösung": Die Namen links neben den Avataren waren teilweise abgeschnitten – das ist jetzt behoben. Außerdem konnte in seltenen Fällen ein Kandidat/eine Kandidatin in dieser Tabelle fehlen – auch das ist jetzt behoben
- Beide Wahrscheinlichkeits-Tabellen passen jetzt auch bei mehr Kandidat*innen auf typischen Bildschirmen ohne seitliches Scrollen

---

## [1.9.1] - 2026-09-05
- Wichtiger Fehler behoben: Die Wahrscheinlichkeits-Berechnung konnte bei der aktuellen Kandidat*innen-Zahl leicht ungenaue Prozentzahlen anzeigen, weil intern zu früh abgeschnitten wurde. Die Berechnung durchsucht jetzt immer den kompletten Lösungsraum

---

## [1.9.0] - 2026-09-05
- Code-Qualität und Stabilität im Hintergrund deutlich verbessert: automatisierte Tests für die wichtigsten Berechnungen eingeführt, die vor jedem Update jetzt automatisch geprüft werden – für dich als Nutzer*in ändert sich dabei nichts sichtbar

---

## [1.8.3] - 2026-09-05
- Code-Qualität im Hintergrund verbessert (Staffelende-Erkennung, Lichter-Anzeige, vertauschte Paare korrigieren) – für dich als Nutzer*in ändert sich dabei nichts sichtbar

---

## [1.8.2] - 2026-09-04
- Wichtiger Fehler behoben: Beim Wechseln zwischen Staffeln konnten in seltenen Fällen Kandidat*innen einer anderen Staffel verschwinden. Das passiert jetzt nicht mehr

---

## [1.8.1] - 2026-09-04
- Wichtiger Fehler behoben: Ein Doppelmatch ging beim Exportieren bzw. beim Anwenden eines Datenbank-Updates verloren. Das betraf konkret Marta & Johannes mit Zoe als zweiter Partnerin. Der Doppelmatch-Status ist jetzt wieder korrekt hinterlegt und bleibt zukünftig erhalten

---

## [1.8.0] - 2026-09-04
- Beim Bearbeiten einer Matchbox werden jetzt korrekt nur noch tatsächlich verfügbare Kandidat*innen zur Auswahl angezeigt
- Der Status "aktiv" bzw. "Perfect Match gefunden" wird in der Übersicht jetzt überall einheitlich angezeigt
- Neu: Matching Nights können jetzt auch direkt im Admin-Bereich angelegt werden, nicht mehr nur im Live-Tracker
- Die Prüfung auf gültige Frau/Mann-Zuordnung beim Speichern einer Matching Night griff bisher nur im Live-Tracker, jetzt auch im Admin-Bereich
- Code-Qualität im Hintergrund verbessert (Budget-Berechnung vereinheitlicht) – für dich als Nutzer*in ändert sich dabei nichts sichtbar
- Wichtiger Fehler behoben: Der "Kompletter Browser-Reset" im Admin-Bereich löschte bisher auch deine selbst eingetragene Lösung ("Deine Lösung"). Das passiert jetzt nicht mehr
- Aktueller Stand der Staffel aktualisiert (Zoe ist raus)

---

## [1.7.0] - 2026-09-03
- Wichtiger Fehler behoben: Das Bestätigen von "Jetzt aktualisieren" konnte bisher deine bereits eingetragenen Matching Nights und Matchbox-Entscheidungen löschen. Das passiert jetzt nicht mehr — ein Update ergänzt nur noch, statt zu löschen
- Der aktuelle Stand der Staffel (Kandidat*innen, Matching Nights, Matchboxes) ist jetzt vollständig verfügbar, ohne dass du alles von Hand nachtragen musst

---

## [1.6.0] - 2026-09-03
- Neu: Wenn die Anzahl Frauen und Männer nicht gleich ist, kann jetzt eine Person zwei Perfect Matches gleichzeitig haben (Doppelmatch) – bei der Matchbox-Eingabe gibt es dafür jetzt ein Häkchen

---

## [1.5.3] - 2026-08-17
- Neue Kandidatin Joena zum Cast hinzugefügt
- "Staffel wählen" zeigte noch den alten Titel "Upcomming" an – zeigt jetzt überall korrekt "Live"

---

## [1.5.2] - 2026-08-16
- Header auf dem Handy jetzt wirklich vollständig repariert: Er wurde beim Scrollen auf manchen Seiten (z.B. Wahrscheinlichkeit) abgeschnitten – das ist jetzt behoben
- Tippfehler "Upcomming" im Staffel-Titel zu "Live" korrigiert

---

## [1.5.1] - 2026-08-14
- Header auf dem Handy repariert: Die Buttons oben rechts wurden auf schmalen Bildschirmen abgeschnitten – jetzt passen sie immer auf den Bildschirm

---

## [1.5.0] - 2026-07-27
- Code-Qualität im Hintergrund verbessert (aufgeräumter Code, klarere Struktur) – für dich als Nutzer*in ändert sich dabei nichts sichtbar
- Hosting-Dokumentation aktualisiert und korrigiert

---

## [1.4.4] - 2026-07-27
- Perfect-Match-Prüfungen (z.B. doppelte Paare, Betrag bei verkauften Matchboxes) funktionieren jetzt in Admin und Übersicht einheitlich
- Wenn ein Perfect Match nachträglich geändert oder gelöscht wird, wird der Status der betroffenen Kandidat*innen jetzt zuverlässig korrigiert (vorher blieb er manchmal fälschlich auf "vergeben" stehen)

---

## [1.4.3] - 2026-07-25
- Einheitlicheres Design für den "Neue Version"-Hinweis

---

## [1.4.2] - 2026-07-25
- Du kannst dir "Was ist neu?" jetzt jederzeit über die Versionsinformationen ansehen, nicht nur direkt nach einem Update
- Einheitlicheres Design der Versionsinformationen

---

## [1.4.1] - 2026-07-25
- Neues App-Icon
- Rechtliche Hinweise (Impressum & Datenschutz) aktualisiert
- Kleinere Verbesserungen im Hintergrund, damit Updates zuverlässiger ankommen

---

## [1.4.0] - 2026-07-25
- Du bekommst jetzt automatisch mit, wenn eine neue Version verfügbar ist – ganz ohne die Seite selbst neu zu laden
- Nach einem Update siehst du kurz, was sich geändert hat

---

## [1.3.0] - 2026-07-24
- Der Status "aktiv" bzw. "Perfect Match gefunden" wird jetzt überall in der App einheitlich angezeigt
- Die Fotos der Kandidat*innen wurden vorübergehend entfernt, bis die Nutzungsrechte dafür geklärt sind
