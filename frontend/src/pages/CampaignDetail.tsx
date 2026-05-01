import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'

interface EmailRow {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  status: string
  error_message: string | null
  sent_at: string | null
}

interface Campaign {
  id: number
  name: string
  status: string
  total_count: number
  sent_count: number
  error_count: number
  created_at: string
  completed_at: string | null
  emails: EmailRow[]
}

const EMAIL_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает',    color: '#f59e0b' },
  sent:    { label: 'Отправлено', color: '#10b981' },
  failed:  { label: 'Ошибка',     color: '#ef4444' },
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const stoppedRef = useRef(false)

  useEffect(() => {
    stoppedRef.current = false

    async function poll() {
      try {
        const c = await api.get<Campaign>(`/campaigns/${id}`)
        setCampaign(c)
        if (!stoppedRef.current && c.status !== 'completed' && c.status !== 'failed') {
          setTimeout(poll, 3000)
        }
      } catch {
        if (!stoppedRef.current) setTimeout(poll, 5000)
      }
    }

    poll()
    return () => { stoppedRef.current = true }
  }, [id])

  if (!campaign) return <p style={{ color: '#94a3b8' }}>Загрузка...</p>

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <Link to="/campaigns" style={{ color: '#4f46e5', fontSize: 14 }}>← Все кампании</Link>
      </div>
      <h1 style={{ marginBottom: 20 }}>{campaign.name}</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Всего" value={campaign.total_count} />
        <StatCard label="Отправлено" value={campaign.sent_count} color="#10b981" />
        <StatCard label="Ошибок" value={campaign.error_count} color="#ef4444" />
        <StatCard label="Статус" value={campaign.status} />
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Email', 'Имя', 'Компания', 'Статус', 'Время'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaign.emails.map(e => {
              const s = EMAIL_STATUS[e.status] ?? { label: e.status, color: '#6b7280' }
              return (
                <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>{e.email}</td>
                  <td style={td}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td style={td}>{e.company_name || '—'}</td>
                  <td style={td}>
                    <span style={{ color: s.color, fontWeight: 500 }}>{s.label}</span>
                    {e.error_message && (
                      <span style={{ display: 'block', fontSize: 12, color: '#ef4444', marginTop: 2 }}>
                        {e.error_message}
                      </span>
                    )}
                  </td>
                  <td style={td}>{e.sent_at ? new Date(e.sent_at).toLocaleTimeString('ru') : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ background: '#fff', padding: '14px 20px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minWidth: 110 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#6b7280', fontWeight: 600, textAlign: 'left' }
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 }
