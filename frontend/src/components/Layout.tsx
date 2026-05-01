import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, background: '#1e293b', color: '#fff', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px 28px', fontWeight: 700, fontSize: 20, color: '#fff' }}>
          Mailer
        </div>
        <NavItem to="/campaigns">Кампании</NavItem>
        <NavItem to="/new-campaign">+ Новая кампания</NavItem>
        <NavItem to="/attachments">Файлы</NavItem>
        <NavItem to="/templates">Шаблоны PDF</NavItem>
        <NavItem to="/email-templates">Шаблоны писем</NavItem>
        <NavItem to="/settings">Настройки</NavItem>
      </nav>
      <main style={{ flex: 1, padding: 32, background: '#f8fafc', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'block',
        padding: '10px 20px',
        color: isActive ? '#818cf8' : '#94a3b8',
        textDecoration: 'none',
        fontWeight: isActive ? 600 : 400,
        background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderLeft: isActive ? '3px solid #818cf8' : '3px solid transparent',
      })}
    >
      {children}
    </NavLink>
  )
}
