import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

interface GmailStatus {
  connected: boolean
  email?: string
}

interface SmtpStatus {
  configured: boolean
  host?: string
  port?: number
  username?: string
  encryption?: string
  from_email?: string
  from_name?: string
}

export default function Settings() {
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [searchParams] = useSearchParams()

  const [smtp, setSmtp] = useState<SmtpStatus | null>(null)
  const [smtpForm, setSmtpForm] = useState({
    host: '', port: '587', username: '', password: '',
    encryption: 'starttls', from_email: '', from_name: '',
  })
  const [smtpLoading, setSmtpLoading] = useState(false)
  const [smtpMessage, setSmtpMessage] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    api.get<GmailStatus>('/gmail/status').then(setStatus)
    api.get<SmtpStatus>('/smtp/status').then(s => {
      setSmtp(s)
      if (s.configured) {
        setSmtpForm({
          host: s.host ?? '', port: String(s.port ?? 587),
          username: s.username ?? '', password: '',
          encryption: s.encryption ?? 'starttls',
          from_email: s.from_email ?? '', from_name: s.from_name ?? '',
        })
      }
    })
    if (searchParams.get('connected') === 'true') {
      setMessage({ text: 'Gmail успешно подключён!', ok: true })
    }
  }, [])

  async function connect() {
    setLoading(true)
    setMessage(null)
    try {
      await api.post('/gmail/credentials', { client_id: clientId, client_secret: clientSecret })
      const { url } = await api.get<{ url: string }>('/gmail/auth-url')
      window.location.href = url
    } catch (e) {
      setMessage({ text: 'Ошибка: ' + (e as Error).message, ok: false })
      setLoading(false)
    }
  }

  async function disconnect() {
    await api.delete('/gmail/disconnect')
    setStatus({ connected: false })
    setMessage({ text: 'Аккаунт отключён', ok: false })
  }

  async function saveSmtp() {
    setSmtpLoading(true)
    setSmtpMessage(null)
    try {
      const s = await api.post<SmtpStatus>('/smtp/settings', {
        ...smtpForm, port: Number(smtpForm.port),
        from_name: smtpForm.from_name || null,
      })
      setSmtp(s)
      setSmtpMessage({ text: 'SMTP сохранён', ok: true })
    } catch (e) {
      setSmtpMessage({ text: 'Ошибка: ' + (e as Error).message, ok: false })
    } finally {
      setSmtpLoading(false)
    }
  }

  async function testSmtp() {
    setSmtpLoading(true)
    setSmtpMessage(null)
    try {
      await api.post('/smtp/test', {})
      setSmtpMessage({ text: 'Тестовое письмо отправлено на ' + smtpForm.from_email, ok: true })
    } catch (e) {
      setSmtpMessage({ text: 'Ошибка: ' + (e as Error).message, ok: false })
    } finally {
      setSmtpLoading(false)
    }
  }

  async function disconnectSmtp() {
    await api.delete('/smtp/settings')
    setSmtp({ configured: false })
    setSmtpForm({ host: '', port: '587', username: '', password: '', encryption: 'starttls', from_email: '', from_name: '' })
    setSmtpMessage({ text: 'SMTP отключён', ok: false })
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Настройки</h1>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          background: message.ok ? '#d1fae5' : '#fee2e2',
          color: message.ok ? '#065f46' : '#991b1b',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ marginBottom: 20 }}>Gmail OAuth2</h2>

        {status === null && <p style={{ color: '#94a3b8' }}>Загрузка...</p>}

        {status?.connected ? (
          <>
            <p style={{ color: '#16a34a', marginBottom: 20 }}>✓ Подключён: <strong>{status.email}</strong></p>
            <button onClick={disconnect} style={btnSecondary}>Отключить</button>
          </>
        ) : status && (
          <>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>
              Введите OAuth2-реквизиты из Google Cloud Console, затем пройдите авторизацию.
            </p>
            <Field label="Client ID">
              <input value={clientId} onChange={e => setClientId(e.target.value)}
                style={input} placeholder="…apps.googleusercontent.com" />
            </Field>
            <Field label="Client Secret">
              <input value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                style={input} type="password" placeholder="GOCSPX-…" />
            </Field>
            <button onClick={connect} disabled={!clientId || !clientSecret || loading} style={btnPrimary}>
              {loading ? 'Перенаправление...' : 'Подключить через Google'}
            </button>
          </>
        )}
      </div>
      <div style={card}>
        <h2 style={{ marginBottom: 4 }}>SMTP</h2>
        {smtp?.configured && (
          <p style={{ color: '#16a34a', fontSize: 14, marginBottom: 16 }}>
            ✓ Настроен: {smtp.from_email} через {smtp.host}:{smtp.port}
          </p>
        )}

        {smtpMessage && (
          <div style={{
            padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14,
            background: smtpMessage.ok ? '#d1fae5' : '#fee2e2',
            color: smtpMessage.ok ? '#065f46' : '#991b1b',
          }}>
            {smtpMessage.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0 12px' }}>
          <Field label="SMTP хост">
            <input value={smtpForm.host} onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))}
              style={input} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Порт">
            <input value={smtpForm.port} onChange={e => setSmtpForm(f => ({ ...f, port: e.target.value }))}
              style={input} placeholder="587" type="number" />
          </Field>
        </div>

        <Field label="Шифрование">
          <select value={smtpForm.encryption} onChange={e => setSmtpForm(f => ({ ...f, encryption: e.target.value }))}
            style={{ ...input, marginTop: 6 }}>
            <option value="starttls">STARTTLS (порт 587)</option>
            <option value="ssl">SSL (порт 465)</option>
            <option value="none">Без шифрования (порт 25)</option>
          </select>
        </Field>

        <Field label="Логин">
          <input value={smtpForm.username} onChange={e => setSmtpForm(f => ({ ...f, username: e.target.value }))}
            style={input} placeholder="user@example.com" />
        </Field>
        <Field label="Пароль">
          <input value={smtpForm.password} onChange={e => setSmtpForm(f => ({ ...f, password: e.target.value }))}
            style={input} type="password" placeholder={smtp?.configured ? '••••••• (оставьте пустым чтобы не менять)' : ''} />
        </Field>
        <Field label="Email отправителя">
          <input value={smtpForm.from_email} onChange={e => setSmtpForm(f => ({ ...f, from_email: e.target.value }))}
            style={input} placeholder="no-reply@example.com" />
        </Field>
        <Field label="Имя отправителя (необязательно)">
          <input value={smtpForm.from_name} onChange={e => setSmtpForm(f => ({ ...f, from_name: e.target.value }))}
            style={input} placeholder="Моя компания" />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <button onClick={saveSmtp} disabled={smtpLoading} style={btnPrimary}>
            {smtpLoading ? 'Сохранение...' : smtp?.configured ? 'Обновить' : 'Сохранить'}
          </button>
          {smtp?.configured && (
            <>
              <button onClick={testSmtp} disabled={smtpLoading} style={btnSecondary}>
                Тест подключения
              </button>
              <button onClick={disconnectSmtp} style={{ ...btnSecondary, color: '#991b1b', borderColor: '#fca5a5' }}>
                Отключить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff', padding: 24, borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: 480,
}
const input: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 12px', marginTop: 6,
  border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
}
const btnPrimary: React.CSSProperties = {
  background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px',
  borderRadius: 6, cursor: 'pointer', fontSize: 14, marginTop: 4,
}
const btnSecondary: React.CSSProperties = {
  background: '#fff', color: '#374151', border: '1px solid #e2e8f0',
  padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
}
