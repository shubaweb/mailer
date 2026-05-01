import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { api } from '../api/client'

interface EmailTemplate {
  id: number
  name: string
  subject: string
  body: string
}

const DEFAULT_BODY = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #4f46e5; padding: 32px; color: #fff; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 32px; color: #1e293b; line-height: 1.6; }
    .body p { margin: 0 0 16px; }
    .footer { padding: 16px 32px; background: #f8fafc; color: #94a3b8; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Привет, {{first_name}}!</h1>
    </div>
    <div class="body">
      <p>Уважаемый(ая) {{first_name}} {{last_name}},</p>
      <p>Представляем предложение для компании <strong>{{company_name}}</strong>.</p>
      <p>С уважением,<br/>Команда</p>
    </div>
    <div class="footer">Вы получили это письмо, так как ваш адрес был добавлен в рассылку.</div>
  </div>
</body>
</html>`

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState(DEFAULT_BODY)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const list = await api.get<EmailTemplate[]>('/email-templates')
    setTemplates(list)
  }

  function selectTemplate(t: EmailTemplate) {
    setSelected(t)
    setName(t.name)
    setSubject(t.subject)
    setBody(t.body)
    setIsNew(false)
    setShowPreview(false)
  }

  function startNew() {
    setSelected(null)
    setName('')
    setSubject('')
    setBody(DEFAULT_BODY)
    setIsNew(true)
    setShowPreview(false)
  }

  async function save() {
    setSaving(true)
    try {
      if (isNew) {
        const t = await api.post<EmailTemplate>('/email-templates', { name, subject, body })
        setTemplates(prev => [t, ...prev])
        setSelected(t)
        setIsNew(false)
      } else if (selected) {
        const t = await api.put<EmailTemplate>(`/email-templates/${selected.id}`, { name, subject, body })
        setTemplates(prev => prev.map(x => x.id === t.id ? t : x))
        setSelected(t)
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!selected || !confirm(`Удалить шаблон "${selected.name}"?`)) return
    await api.delete(`/email-templates/${selected.id}`)
    setTemplates(prev => prev.filter(x => x.id !== selected.id))
    setSelected(null)
    setIsNew(false)
  }

  const hasChanges = isNew
    ? name !== '' || subject !== '' || body !== DEFAULT_BODY
    : selected !== null && (name !== selected.name || subject !== selected.subject || body !== selected.body)

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 96px)' }}>
      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Шаблоны писем</h2>
        <button onClick={startNew} style={btnPrimary}>+ Новый</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {templates.map(t => (
            <div
              key={t.id}
              onClick={() => selectTemplate(t)}
              style={{
                padding: '9px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                background: selected?.id === t.id ? '#eef2ff' : '#fff',
                border: `1px solid ${selected?.id === t.id ? '#818cf8' : '#e2e8f0'}`,
                fontSize: 13,
                fontWeight: selected?.id === t.id ? 600 : 400,
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={t.name}
            >
              {t.name}
            </div>
          ))}
          {templates.length === 0 && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Нет шаблонов</p>
          )}
        </div>
      </div>

      {/* Editor */}
      {(selected || isNew) ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {/* Top bar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Название шаблона"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={() => setShowPreview(p => !p)}
              style={showPreview ? btnActive : btnSecondary}
            >
              {showPreview ? '✕ Предпросмотр' : '👁 Предпросмотр'}
            </button>
            <button onClick={save} disabled={saving || !hasChanges} style={{
              ...btnPrimary,
              opacity: saving || !hasChanges ? 0.5 : 1,
              cursor: saving || !hasChanges ? 'default' : 'pointer',
            }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            {selected && (
              <button onClick={remove} style={btnDanger}>Удалить</button>
            )}
          </div>

          {/* Subject */}
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Тема письма — можно использовать {{company_name}} и другие плейсхолдеры"
            style={inputStyle}
          />

          {/* Editor + Preview */}
          <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
            <div style={{
              flex: showPreview ? 1 : 2,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              overflow: 'hidden',
            }}>
              <Editor
                height="100%"
                language="html"
                value={body}
                onChange={v => setBody(v ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            </div>

            {showPreview && (
              <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', background: '#f1f5f9' }}>
                <iframe
                  srcDoc={body}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="preview"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
          Выберите шаблон слева или создайте новый
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  background: '#fff',
}
const btnPrimary: React.CSSProperties = {
  background: '#4f46e5', color: '#fff', border: 'none',
  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
}
const btnDanger: React.CSSProperties = {
  background: '#fee2e2', color: '#991b1b', border: 'none',
  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
}
const btnSecondary: React.CSSProperties = {
  background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
}
const btnActive: React.CSSProperties = {
  background: '#e0e7ff', color: '#4338ca', border: '1px solid #818cf8',
  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
}
