import { FileUp, FolderOpen, ShieldCheck } from 'lucide-react'
import { useRef, useState } from 'react'

export const MAX_FILE_BYTES = 100 * 1024 * 1024

interface FileUploaderProps {
  disabled?: boolean
  onFiles: (files: File[]) => void
}

export function FileUploader({ disabled = false, onFiles }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const accept = (files: FileList | null) => {
    if (files) onFiles(Array.from(files))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) accept(event.dataTransfer.files) }}
    >
      <input ref={inputRef} type="file" multiple hidden onChange={(event) => accept(event.target.files)} />
      <div className="dropzone-icon"><FileUp size={21} /></div>
      <div className="dropzone-copy">
        <strong>Arrastrá archivos hasta acá</strong>
        <span>o seleccioná desde tu dispositivo · hasta 100 MiB por archivo</span>
      </div>
      <button className="button button-secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <FolderOpen size={16} /> Elegir archivos
      </button>
      <div className="privacy-note"><ShieldCheck size={14} /> Tus archivos se procesan en este navegador</div>
    </div>
  )
}
