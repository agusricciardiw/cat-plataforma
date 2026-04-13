import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const PUEDE_CREAR = ['gerencia', 'jefe_base', 'admin']

async function resetearBase() {
  // 1. Misiones → sin_asignar, limpias
  const { data: misiones } = await supabase.from('misiones').select('id')
  for (const m of (misiones ?? [])) {
    await supabase.from('misiones').update({
      estado: 'sin_asignar',
      agentes_asignados: [],
      iniciada_en: null,
      cerrada_en: null,
      reporte_texto: null,
      reporte_fotos: [],
      historial: [],
    }).eq('id', m.id)
  }
  // 2. Agentes → libre, sin interrupciones
  const { data: agentes } = await supabase.from('agentes').select('id')
  for (const a of (agentes ?? [])) {
    await supabase.from('agentes').update({
      estado_turno: 'libre',
      misiones_interrumpidas: [],
    }).eq('id', a.id)
  }
  // 3. Actividad → borrar todo (requiere policy DELETE en RLS)
  await supabase.from('actividad').delete().gte('created_at', '2000-01-01')
}

export default function Topbar({ onNuevaMision }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const rol = profile?.rol ?? 'agente'
  const initials = profile ? `${profile.nombre?.[0] ?? ''}${profile.apellido?.[0] ?? ''}`.toUpperCase() : '?'
  const [showReset, setShowReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReset() {
    setResetting(true)
    await resetearBase()
    setResetting(false)
    setDone(true)
    setTimeout(() => { setDone(false); setShowReset(false); window.location.reload() }, 1200)
  }

  return (
    <>
      <div style={{ background: '#1a2744', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', flexShrink: 0, width: '100%' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, background: '#f5c800', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#1a2744', flexShrink: 0 }}>BA</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Plataforma CAT</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>GCBA</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 🔧 Reset — solo admin en /misiones */}
          {rol === 'admin' && location.pathname === '/misiones' && (
            <button onClick={() => setShowReset(true)} title="Resetear base (dev)"
              style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12}}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Reset
            </button>
          )}

          {PUEDE_CREAR.includes(rol) && location.pathname === '/misiones' && (
            <button onClick={onNuevaMision}
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 10, border: 'none', background: '#f5c800', color: '#1a2744', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:13,height:13}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva misión
            </button>
          )}

          {location.pathname === '/' && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4ecdc4', background: 'rgba(78,205,196,0.15)', padding: '5px 14px', borderRadius: 20 }}>
              Turno en curso · 06:00–14:00
            </span>
          )}

          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" style={{width:16,height:16}}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            <div style={{ width: 8, height: 8, background: '#f5c800', borderRadius: '50%', position: 'absolute', top: 5, right: 5 }}/>
          </div>

          <div onClick={() => navigate('/perfil')} style={{ width: 34, height: 34, borderRadius: '50%', background: '#f5c800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#1a2744', cursor: 'pointer' }}>
            {initials}
          </div>
        </div>
      </div>

      {showReset && (
        <>
          <div onClick={() => !resetting && setShowReset(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', borderRadius: 20, padding: '28px', zIndex: 901, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0f6e56' }}>Base reseteada</div>
                <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 4 }}>Recargando...</div>
              </div>
            ) : (
              <>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fce8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a32d2d" strokeWidth="2" style={{width:22,height:22}}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>Resetear base de desarrollo</div>
                <div style={{ fontSize: 14, color: '#5d5d5a', lineHeight: 1.6, marginBottom: 20 }}>
                  Esto va a:
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {['Poner todas las misiones en "Sin asignar"', 'Vaciar los agentes asignados de cada misión', 'Poner todos los agentes en estado Libre', 'Limpiar el feed de actividad'].map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3d3d3a' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#a32d2d', flexShrink: 0 }}/>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowReset(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleReset} disabled={resetting} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#a32d2d', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {resetting ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14,animation:'spin 1s linear infinite'}}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                        Reseteando...
                      </>
                    ) : 'Confirmar reset'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
