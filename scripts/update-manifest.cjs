#!/usr/bin/env node

/**
 * Script zur Aktualisierung der manifest.json
 * 
 * Generiert Manifest aus Git-Tag.
 * Zentrale Version für Code und Daten. Ob neue Staffel-Daten vorliegen, erkennt die App
 * nicht über das Manifest, sondern über einen Inhalts-Hash der Daten-Datei der aktiven
 * Staffel (siehe databaseUpdateService.ts, ODI-331).
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const MANIFEST_PATH = path.join(__dirname, '..', 'public', 'manifest.json')
const PROJECT_ROOT = path.join(__dirname, '..')
const HAS_GIT_REPO = fs.existsSync(path.join(PROJECT_ROOT, '.git'))

function getGitTag() {
  if (!HAS_GIT_REPO) {
    // Ohne Git-Repository nutzen wir eine neutrale Default-Version
    return 'v0.0.0'
  }
  try {
    // Versuche aktuellen Tag zu bekommen
    const tag = execSync('git describe --tags --exact-match HEAD', { encoding: 'utf8' }).trim()
    return tag
  } catch {
    try {
      // Fallback: Neuester Tag
      const describe = execSync('git describe --tags', { encoding: 'utf8' }).trim()
      const match = describe.match(/^([^-]+)/)
      return match ? match[1] : 'v0.0.0'
    } catch {
      return 'v0.0.0'
    }
  }
}

function getTagDate(tag) {
  if (!HAS_GIT_REPO) {
    // Ohne Git-Repository einfach aktuelles Datum verwenden
    return new Date().toISOString()
  }
  try {
    const date = execSync(`git log -1 --format=%ai ${tag}`, { encoding: 'utf8' }).trim()
    return new Date(date).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function updateManifest() {
  try {
    // Git-Tag ermitteln
    const gitTag = getGitTag()
    const released = getTagDate(gitTag)

    // Manifest erstellen
    const manifest = {
      version: gitTag,
      released: released,
      description: "AYTO-Tracker - Zentrale Version für Code und Daten"
    }

    // Manifest speichern
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))

    console.log('✅ Manifest erfolgreich generiert:')
    console.log(`   Version: ${manifest.version}`)
    console.log(`   Released: ${manifest.released}`)
    
    return manifest
  } catch (error) {
    console.error('❌ Fehler beim Generieren des Manifests:', error)
    process.exit(1)
  }
}

// Script ausführen
if (require.main === module) {
  updateManifest()
}

module.exports = { updateManifest }
