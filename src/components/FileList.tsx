import { File, FileX2, Hash, Trash2 } from 'lucide-react'
import type { FileEntry } from '../types/merkle'
import { formatBytes } from '../utils/format'
import { toHex } from '../core/hash'

interface FileListProps {
  entries: FileEntry[]
  selectedId: string | null
  disabled?: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export function FileList({ entries, selectedId, disabled, onSelect, onRemove }: FileListProps) {
  if (entries.length === 0) {
    return <div className="empty-files"><FileX2 size={21} /><span>Todavía no hay archivos en el conjunto.</span></div>
  }
  return (
    <div className="file-list">
      {entries.map((entry, index) => (
        <div className={`file-row ${selectedId === entry.id ? 'file-row-selected' : ''}`} key={entry.id}>
          <button className="file-main" onClick={() => onSelect(entry.id)} title="Seleccionar para el laboratorio de integridad">
            <div className="file-icon"><File size={17} /></div>
            <div className="file-meta">
              <div className="file-title"><span className="file-index">{String(index + 1).padStart(2, '0')}</span><strong title={entry.file.name}>{entry.file.name}</strong></div>
              <span className="file-size">{formatBytes(entry.file.size)} · hoja {index}</span>
            </div>
          </button>
          <div className="file-hash"><Hash size={13} /><code>{toHex(entry.leafHash).slice(0, 16)}…</code></div>
          <button className="icon-button danger-hover" aria-label={`Eliminar ${entry.file.name}`} title="Eliminar archivo" disabled={disabled} onClick={() => onRemove(entry.id)}><Trash2 size={15} /></button>
        </div>
      ))}
    </div>
  )
}
