import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'

interface Attachment {
  id: number
  original_name: string
  size: number
}

interface TemplateFile {
  id: number
  original_name: string
  file_type: string
}

interface EmailTemplate {
  id: number
  name: string
  subject: string
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NewCampaign() {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [templates, setTemplates] = useState<TemplateFile[]>([])
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [emailTemplateId, setEmailTemplateId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get<Attachment[]>('/attachments').then(setAttachments)
    api.get<TemplateFile[]>('/templates').then(setTemplates)
    api.get<EmailTemplate[]>('/email-templates').then(setEmailTemplates)
  }, [])

  function toggleAttachment(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('file', file)
      selectedIds.forEach(id => fd.append('attachment_ids', String(id)))
      if (templateId !== null) fd.append('template_id', String(templateId))
      if (emailTemplateId !== null) fd.append('email_template_id', String(emailTemplateId))
      const campaign = await api.postForm<{ id: number }>('/campaigns', fd)
      navigate(`/campaigns/${campaign.id}`)
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Новая кампания</h1>

      <div style={card}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Название кампании</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={input}
              placeholder="Рассылка апрель 2026"
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>CSV файл</label>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
              Обязательные колонки: <code>email</code>, <code>first_name</code>, <code>last_name</code>, <code>company_name</code>
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 14 }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Вложения (PDF)</label>
            {attachments.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
                Нет загруженных файлов.{' '}
                <Link to="/attachments" style={{ color: '#4f46e5' }}>Загрузить PDF →</Link>
              </p>
            ) : (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attachments.map(a => (
                  <label
                    key={a.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      border: `1px solid ${selectedIds.has(a.id) ? '#818cf8' : '#e2e8f0'}`,
                      borderRadius: 6, cursor: 'pointer',
                      background: selectedIds.has(a.id) ? '#eef2ff' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleAttachment(a.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 16 }}>📄</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{a.original_name}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatSize(a.size)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Шаблон PDF (персонализированный файл)</label>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
              Будет сгенерирован отдельный PDF для каждого получателя с подставленными данными
            </p>
            {templates.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
                Нет загруженных шаблонов.{' '}
                <Link to="/templates" style={{ color: '#4f46e5' }}>Загрузить шаблон →</Link>
              </p>
            ) : (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  border: `1px solid ${templateId === null ? '#818cf8' : '#e2e8f0'}`,
                  borderRadius: 6, cursor: 'pointer',
                  background: templateId === null ? '#eef2ff' : '#fff',
                }}>
                  <input
                    type="radio"
                    name="template"
                    checked={templateId === null}
                    onChange={() => setTemplateId(null)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14, color: '#6b7280' }}>Без шаблона</span>
                </label>
                {templates.map(t => (
                  <label key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: `1px solid ${templateId === t.id ? '#818cf8' : '#e2e8f0'}`,
                    borderRadius: 6, cursor: 'pointer',
                    background: templateId === t.id ? '#eef2ff' : '#fff',
                  }}>
                    <input
                      type="radio"
                      name="template"
                      checked={templateId === t.id}
                      onChange={() => setTemplateId(t.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 16 }}>{t.file_type === 'docx' ? '📝' : '📄'}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{t.original_name}</span>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: t.file_type === 'docx' ? '#dbeafe' : '#fef3c7',
                      color: t.file_type === 'docx' ? '#1d4ed8' : '#92400e',
                      textTransform: 'uppercase',
                    }}>{t.file_type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Шаблон письма</label>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
              HTML-шаблон тела письма с подстановкой данных из CSV
            </p>
            {emailTemplates.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
                Нет шаблонов.{' '}
                <Link to="/email-templates" style={{ color: '#4f46e5' }}>Создать шаблон →</Link>
              </p>
            ) : (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  border: `1px solid ${emailTemplateId === null ? '#818cf8' : '#e2e8f0'}`,
                  borderRadius: 6, cursor: 'pointer',
                  background: emailTemplateId === null ? '#eef2ff' : '#fff',
                }}>
                  <input
                    type="radio"
                    name="email_template"
                    checked={emailTemplateId === null}
                    onChange={() => setEmailTemplateId(null)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14, color: '#6b7280' }}>Стандартный шаблон</span>
                </label>
                {emailTemplates.map(t => (
                  <label key={t.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    border: `1px solid ${emailTemplateId === t.id ? '#818cf8' : '#e2e8f0'}`,
                    borderRadius: 6, cursor: 'pointer',
                    background: emailTemplateId === t.id ? '#eef2ff' : '#fff',
                  }}>
                    <input
                      type="radio"
                      name="email_template"
                      checked={emailTemplateId === t.id}
                      onChange={() => setEmailTemplateId(t.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.subject}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Запуск...' : 'Запустить рассылку'}
          </button>
        </form>
      </div>

      <div style={{ ...card, marginTop: 16, fontSize: 13, color: '#64748b' }}>
        <strong>Пример CSV:</strong>
        <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginTop: 8, overflowX: 'auto' }}>
{`email,first_name,last_name,company_name
ivan@example.com,Иван,Иванов,ООО Ромашка
anna@example.com,Анна,Петрова,ИП Петрова`}
        </pre>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff', padding: 24, borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: 520,
}
const input: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 12px', marginTop: 6,
  border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: '#374151' }
const btnPrimary: React.CSSProperties = {
  background: '#4f46e5', color: '#fff', border: 'none',
  padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
}
