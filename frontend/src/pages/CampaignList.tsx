import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

interface Campaign {
  id: number
  name: string
  status: string
  total_count: number
  sent_count: number
  error_count: number
  created_at: string
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Ожидает',      color: '#f59e0b' },
  running:   { label: 'Отправляется', color: '#3b82f6' },
  completed: { label: 'Завершена',    color: '#10b981' },
  failed:    { label: 'Ошибка',       color: '#ef4444' },
}

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    const load = () => api.get<Campaign[]>('/campaigns').then(setCampaigns)
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Кампании</h1>
        <Link to="/new-campaign" style={btnPrimary}>+ Новая кампания</Link>
      </div>

      {campaigns.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Кампаний пока нет. Создайте первую!</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Название', 'Статус', 'Прогресс', 'Ошибок', 'Создана', ''].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const s = STATUS[c.status] ?? { label: c.status, color: '#6b7280' }
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={td}>{c.name}</td>
                    <td style={td}><span style={{ color: s.color, fontWeight: 500 }}>{s.label}</span></td>
                    <td style={td}>{c.sent_count} / {c.total_count}</td>
                    <td style={td}>{c.error_count > 0 ? <span style={{ color: '#ef4444' }}>{c.error_count}</span> : '—'}</td>
                    <td style={td}>{new Date(c.created_at).toLocaleString('ru')}</td>
                    <td style={td}><Link to={`/campaigns/${c.id}`} style={{ color: '#4f46e5' }}>Детали →</Link></td>
                  </tr>
                )
              })}
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
  borderRadius: 6, textDecoration: 'none', fontSize: 14,
}
