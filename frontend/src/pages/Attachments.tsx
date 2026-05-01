import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

interface Attachment {
  id: number
  original_name: string
  size: number
  created_at: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Attachments() {
  const [files, setFiles] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await api.get<Attachment[]>('/attachments')
    setFiles(data)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.postForm('/attachments', fd)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Удалить файл «${name}»?`)) return
    await api.delete(`/attachments/${id}`)
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Файлы</h1>
        <label style={{ ...btnPrimary, cursor: 'pointer' }}>
          {uploading ? 'Загрузка...' : '+ Загрузить PDF'}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {files.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Нет загруженных файлов. Загрузите PDF чтобы прикреплять их к рассылкам.</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Файл', 'Размер', 'Загружен', ''].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>📄</span>
                      {f.original_name}
                    </span>
                  </td>
                  <td style={td}>{formatSize(f.size)}</td>
                  <td style={td}>{new Date(f.created_at).toLocaleString('ru')}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleDelete(f.id, f.original_name)}
                      style={btnDanger}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#6b7280', fontWeight: 600, textAlign: 'left' }
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 }
const btnPrimary: React.CSSProperties = {
  background: '#4f46e5', color: '#fff', padding: '10px 18px',
  borderRadius: 6, textDecoration: 'none', fontSize: 14, border: 'none',
}
const btnDanger: React.CSSProperties = {
  background: 'none', color: '#ef4444', border: '1px solid #fecaca',
  padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
}
