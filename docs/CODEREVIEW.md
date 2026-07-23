# 🔍 Code Review Checklist

Bitte prüfe die folgenden Punkte, bevor du den PR approvest oder mergest:

## ✅ Allgemein / Clean Code
- [ ] Funktionen & Komponenten sind klein (max. ~50 LOC) und haben **eine Verantwortlichkeit** (Single Responsibility).
- [ ] Variablen-, Funktions- und Klassennamen sind **aussagekräftig und beschreibend**.
- [ ] Kommentare erklären das „Warum“ – nicht das „Wie“.
- [ ] Fehler- und Ausnahmebehandlung ist vorhanden und verständlich.

## 🛠️ TypeScript / Typisierung
- [ ] `strict` Mode aktiv, keine ungewollten `any`-Typen.
- [ ] API-Interfaces und DTOs sind klar definiert.
- [ ] Domain-Typen werden zentral gepflegt und nicht dupliziert.
- [ ] TypeScript-Compiler (`tsc`) läuft fehlerfrei.

## 🏗️ Architektur / Struktur
- [ ] UI, Business-Logic (Services) und Datenzugriff (Dexie) sind klar getrennt - keine direkten `db.*`-Zugriffe aus Komponenten.
- [ ] Neue Schreibpfade in Services rufen `assertSeasonWritable()` auf, bevor sie schreiben.
- [ ] Ordnerstruktur folgt Projektkonventionen (`components`, `features`, `hooks`, `lib`, `services`, `types`).

## ⚛️ React
- [ ] React Hooks-Regeln werden eingehalten (`eslint-plugin-react-hooks` prüft dies).
- [ ] Neue Admin-/Overview-Screens nutzen MUI konsistent zum Rest von `features/admin`/`features/overview`; neue geteilte Primitives gehen nach `components/ui` (shadcn/Radix) - nicht beide Systeme in derselben Komponente mischen.
- [ ] Komponenten sind möglichst „pure“ und **manuell getestet** (es gibt keine automatisierte Test-Suite, siehe unten).

## 🎨 Styling / Tailwind
- [ ] Tailwind-Klassen sind konsistent und lesbar, ggf. mit `clsx`/`tailwind-merge`.
- [ ] Wiederkehrende Styles sind im `tailwind.config.js` oder via `@apply` zentralisiert.
- [ ] Purge/Content-Konfiguration ist korrekt → keine unnötigen CSS-Reste.

## 🤖 Automatisierte Prüfungen
- [ ] `npm run lint` läuft (bestehende `no-explicit-any`-Fehler in Alt-Code sind bekannt und kein neuer Blocker, aber keine neuen hinzufügen).
- [ ] `npm run build` läuft fehlerfrei durch - der `tsc -b`-Schritt darin ist aktuell das **einzige** harte Gate, da es keine automatisierte Test-Suite gibt (kein vitest/jest, kein Prettier konfiguriert).
- [ ] Der GitHub-Actions-Deploy-Workflow prüft nur `npm ci && npm run build` - nichts anderes läuft in CI, Review muss das kompensieren.
- [ ] Keine ungenutzten Imports, Variablen oder Dependencies.

## 🔒 Sicherheit / Qualität
- [ ] Keine geheimen Keys, Passwörter oder Tokens im Code.
- [ ] Dependencies sind aktuell (Dependabot/Snyk geprüft).
- [ ] PR ist in sinnvolle Commits aufgeteilt und < 300 LOC (sofern möglich).

---

👉 **Reviewer-Hinweis:** Wenn du einen Punkt findest, der fehlt oder unklar ist, bitte direkt im PR kommentieren oder als Verbesserungsvorschlag markieren.
