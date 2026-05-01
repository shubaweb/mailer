import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

interface GmailStatus {
  connected: boolean
  email?: string
}

export default function Settings() {
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    api.get<GmailStatus>('/gmail/status').then(setStatus)
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

      <div style={card}>
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
