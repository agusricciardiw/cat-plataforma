import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  {
    label: 'Inicio', path: '/',
    icon: (active) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#1a2744' : 'none'} stroke={active ? '#1a2744' : '#aeaeb2'} strokeWidth="2" style={{width:22,height:22}}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  },
  {
    label: 'Misiones', path: '/misiones',
    icon: (active) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a2744' : '#aeaeb2'} strokeWidth="2" style={{width:22,height:22}}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
]

export default function NavbarMobile({ onPlus }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
      borderTop: '0.5px solid #e5e5ea', padding: '10px 0 20px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      zIndex: 100,
    }}>
      {/* Inicio */}
      <div onClick={() => navigate('/')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
        {TABS[0].icon(location.pathname === '/')}
        <span style={{ fontSize: 10, color: location.pathname === '/' ? '#1a2744' : '#aeaeb2', fontWeight: location.pathname === '/' ? 700 : 400 }}>Inicio</span>
      </div>

      {/* Misiones */}
      <div onClick={() => navigate('/misiones')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
        {TABS[1].icon(location.pathname === '/misiones')}
        <span style={{ fontSize: 10, color: location.pathname === '/misiones' ? '#1a2744' : '#aeaeb2', fontWeight: location.pathname === '/misiones' ? 700 : 400 }}>Misiones</span>
      </div>

      {/* Botón + central */}
      <div
        onClick={onPlus}
        style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -20, border: '3px solid #f5f5f7', cursor: 'pointer' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{width:20,height:20}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>

      {/* Alertas */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{width:22,height:22}}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span style={{ fontSize: 10, color: '#aeaeb2' }}>Alertas</span>
      </div>

      {/* Perfil */}
      <div onClick={() => navigate('/perfil')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{width:22,height:22}}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span style={{ fontSize: 10, color: '#aeaeb2' }}>Perfil</span>
      </div>
    </div>
  )
}
