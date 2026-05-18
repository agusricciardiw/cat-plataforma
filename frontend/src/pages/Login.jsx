import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import logoCat from '../assets/logo-cat.png'
import logoBa  from '../assets/logo-ba-ciudad.svg'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a2744',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px'
    }}>
      {/* Logo / Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {/* Logos */}
        <div className="sigat-logos" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 22, marginBottom: 22, flexWrap: 'wrap',
        }}>
          <img
            src={logoCat}
            alt="Cuerpo de Agentes de Tránsito"
            className="sigat-logo-cat"
            style={{ height: 60, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }}
          />
          <div className="sigat-divisor" style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
          <img
            src={logoBa}
            alt="Buenos Aires Ciudad"
            className="sigat-logo-ba"
            style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.85 }}
          />
        </div>

        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', margin: '0 0 5px', letterSpacing: '-0.5px' }}>
          SIGAT
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Sistema Integrado de Gestión de Agentes de Tránsito
        </p>
      </div>

      {/* Card de login */}
      <div style={{
        background: '#fff', borderRadius: '24px', padding: '28px 24px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.18)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2744', margin: '0 0 20px' }}>
          Ingresar
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Usuario / Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
              inputMode="email"
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                border: '1.5px solid #e5e5ea', fontSize: '16px', outline: 'none',
                fontFamily: 'inherit', color: '#1d1d1f', background: '#f9f9fb',
                boxSizing: 'border-box', transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#1a2744'}
              onBlur={e => e.target.style.borderColor = '#e5e5ea'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                border: '1.5px solid #e5e5ea', fontSize: '16px', outline: 'none',
                fontFamily: 'inherit', color: '#1d1d1f', background: '#f9f9fb',
                boxSizing: 'border-box', transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#1a2744'}
              onBlur={e => e.target.style.borderColor = '#e5e5ea'}
            />
          </div>

          {error && (
            <div style={{
              background: '#fce8e8', color: '#a32d2d', borderRadius: '10px',
              padding: '10px 14px', fontSize: '13px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', minHeight: 50, padding: '14px', borderRadius: '14px',
              background: loading ? '#e5e5ea' : '#1a2744',
              color: loading ? '#8e8e93' : '#fff',
              fontSize: '15px', fontWeight: '700', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              letterSpacing: '-0.2px'
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#8e8e93' }}>
          ¿Olvidaste tu contraseña?{' '}
          <span style={{ color: '#185fa5', cursor: 'pointer', fontWeight: '600' }}>
            Recuperar
          </span>
        </p>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '28px', textAlign: 'center' }}>
        GCBA · Gobierno de la Ciudad de Buenos Aires
      </p>

      <style>{`
        @media (max-width: 380px) {
          .sigat-logo-cat { height: 48px !important; }
          .sigat-logo-ba  { height: 28px !important; }
          .sigat-divisor  { height: 38px !important; }
          .sigat-logos    { gap: 16px !important; }
        }
      `}</style>
    </div>
  )
}
