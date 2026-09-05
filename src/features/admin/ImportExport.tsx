import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import { getActiveSeasonId, assertSeasonWritable } from '@/services/seasonService'
import { isFileNewerThanLast, saveLastImportedJsonFile } from '@/utils/jsonVersion'
import { normalizeLegacyParticipant, type LegacyParticipantJSON } from '@/utils/jsonImport'

export function ImportExport(){
  async function doExport(){
    const sid = await getActiveSeasonId()
    const all = await db.participants.where('seasonId').equals(sid).toArray()
    const blob = new Blob([JSON.stringify(all,null,2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='participants.json'; a.click(); URL.revokeObjectURL(url)
  }
  async function doImport(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; if(!file) return
    
    try {
      const text = await file.text();
      // Dateinamen-/Datumsprüfung
      const check = isFileNewerThanLast(file.name)
      if (check.isNewer === false) {
        const proceed = confirm(
          `Die ausgewählte Datei scheint nicht neuer zu sein als die zuletzt verwendete.\n\n`+
          `Zuletzt importiert: ${check.lastFileName ?? 'unbekannt'}\n`+
          `Aktuelle Datei: ${file.name}\n\n`+
          `Trotzdem importieren?`
        )
        if (!proceed) return
      }
      const arr = JSON.parse(text);
      const seasonId = await getActiveSeasonId()
      await assertSeasonWritable(seasonId)
      
      // Daten normalisieren und Gender-Mapping durchführen
      const normalizedParticipants = (arr as LegacyParticipantJSON[]).map((participant) => ({
        ...normalizeLegacyParticipant(participant, seasonId),
        // ID beibehalten, falls vorhanden
        ...(participant.id && { id: participant.id })
      }));
      
      console.log('Normalisierte Kandidat*innen:', normalizedParticipants);
      
      await db.transaction('rw', db.participants, async () => {
        await db.participants.where('seasonId').equals(seasonId).delete();
        await db.participants.bulkPut(normalizedParticipants);
      });
      
      // Nach Erfolg: Dateiname speichern
      saveLastImportedJsonFile(file.name)
      alert(`Import erfolgreich abgeschlossen!\n\n${normalizedParticipants.length} Kandidat*innen wurden importiert.`);
      location.reload();
    } catch (error) {
      console.error('Fehler beim Import:', error);
      alert(`Fehler beim Import: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n\nBitte überprüfen Sie die JSON-Datei.`);
    }
  }
  return (
    <div className="flex gap-2">
      <Button onClick={doExport} variant="outline">Export JSON</Button>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-md border px-3 h-10">
        <span>Import JSON</span>
        <input type="file" accept="application/json" className="hidden" onChange={doImport}/>
      </label>
    </div>
  )
}


