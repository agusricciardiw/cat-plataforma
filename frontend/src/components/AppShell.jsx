/**
 * AppShell.jsx
 * Layout principal del sistema CAT.
 * Sidebar colapsable (desktop) + topbar + navbar mobile.
 * Soporta grupos colapsables en el sidebar.
 *
 * Props:
 *   children     — contenido del modulo
 *   accionHeader — { label, onClick } boton de accion contextual (ej: "+ Nueva OS")
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ModalPerfil from './ModalPerfil'
import api from '../lib/api'
import logoCat from '../assets/logo-cat.png'
import logoBa from '../assets/logo-ba-ciudad.svg'

// ── Paleta ────────────────────────────────────────────────────
const C = {
  sidebar:      '#1a2744',
  sidebarHover: '#243356',
  sidebarActive:'#2d4a8a',
  accent:       '#f5c800',
  text:         '#fff',
  textMuted:    'rgba(255,255,255,0.38)',
  textSub:      'rgba(255,255,255,0.6)',
  bg:           '#eef1f6',
  border:       'rgba(255,255,255,0.08)',
}

// Visibilidad controlada por permisos VER_* — los arrays de roles ya no se usan

// ── Íconos ────────────────────────────────────────────────────
const IcoHome = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IcoMisiones = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
)
const IcoOS = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IcoSSAAGrupo = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IcoOSAdicional = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
)
const IcoGestionSA = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IcoServicios = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
)
const IcoPresupuesto = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="13" y2="17"/>
    <line x1="12" y1="11" x2="12" y2="15"/>
  </svg>
)
const IcoCobro = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
)
const IcoFacturacion = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
const IcoEquipo = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3"/>
    <path d="M6 20v-2a6 6 0 0112 0v2"/>
    <circle cx="4" cy="14" r="2"/><path d="M2 20v-1a4 4 0 014-4"/>
    <circle cx="20" cy="14" r="2"/><path d="M22 20v-1a4 4 0 00-4-4"/>
  </svg>
)
const IcoImportar = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IcoChevronDown = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IcoChevronRight = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ── Estructura de navegación ──────────────────────────────────
// permiso: null = visible para todos | string = clave VER_* requerida
const NAV_ITEMS = [
  { id: 'home',          label: 'Inicio',              path: '/',                    exact: true, permiso: null,              icon: IcoHome },
  { id: 'misiones',      label: 'Misiones',             path: '/misiones',            permiso: 'VER_MISIONES',     icon: IcoMisiones },
  { id: 'os',            label: 'Ordenes de servicio',  path: '/os',                  permiso: 'VER_OS',           icon: IcoOS },
  {
    id: 'ssaa',
    label: 'Servicios Adicionales',
    icon: IcoSSAAGrupo,
    group: true,
    children: [
      { id: 'servicios',    label: 'Servicios',      path: '/servicios',            permiso: 'VER_SERVICIOS',    icon: IcoServicios },
      { id: 'presupuestos', label: 'Presupuestos',   path: '/presupuestos',         permiso: 'VER_PRESUPUESTOS', icon: IcoPresupuesto },
      { id: 'os_adicional', label: 'OS Adicional',   path: '/os-adicional',         permiso: 'VER_OS_ADICIONAL', icon: IcoOSAdicional },
      { id: 'gestion_ssaa', label: 'Gestión SS.AA.', path: '/servicios-adicionales',permiso: 'VER_SSAA',         icon: IcoGestionSA },
      { id: 'cobros',       label: 'Cobro',          path: '/cobros',               permiso: 'VER_COBROS',       icon: IcoCobro },
      { id: 'facturacion',  label: 'Facturación',    path: '/facturacion',          permiso: 'VER_FACTURACION',  icon: IcoFacturacion },
    ],
  },
  { id: 'equipo',         label: 'Mi equipo',            path: '/equipo',              permiso: 'VER_EQUIPO',            icon: IcoEquipo },
  { id: 'nomina',         label: 'Nómina',               path: '/nomina',              permiso: 'VER_NOMINA',            icon: IcoImportar },
  { id: 'importar_nomina',label: 'Sincronizar Nómina',   path: '/importar-nomina',     permiso: 'ADMIN_IMPORTAR_NOMINA', icon: IcoImportar },
]

// ── Helpers ───────────────────────────────────────────────────
function getInitials(nombre) {
  if (!nombre) return '?'
  const p = nombre.trim().split(' ')
  return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : p[0][0].toUpperCase()
}

function filterNavItems(items, tienePermiso) {
  return items
    .filter(i => !i.permiso || tienePermiso(i.permiso))
    .map(i => {
      if (i.group && i.children) {
        return { ...i, children: i.children.filter(c => !c.permiso || tienePermiso(c.permiso)) }
      }
      return i
    })
    .filter(i => !i.group || (i.children?.length ?? 0) > 0)
}

/** Devuelve todos los paths navegables (aplanando grupos) */
function flatPaths(items) {
  return items.flatMap(i => i.group ? (i.children ?? []) : [i])
}

function isItemActive(item, path) {
  if (item.exact) return path === item.path
  if (!item.path) return false
  if (path === item.path) return true
  return path.startsWith(item.path + '/')
}

// ── SidebarItem (item simple) ─────────────────────────────────
function SidebarItem({ item, active, expanded, onClick, compact = false }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={!expanded ? item.label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 8 : 11,
        padding: compact
          ? (expanded ? '6px 10px 6px 28px' : '6px 0')
          : (expanded ? '9px 14px' : '9px 0'),
        justifyContent: expanded ? 'flex-start' : 'center',
        borderRadius: 9,
        cursor: 'pointer',
        background: active ? C.sidebarActive : hovered ? C.sidebarHover : 'transparent',
        color: active ? '#fff' : hovered ? 'rgba(255,255,255,0.85)' : (compact ? 'rgba(255,255,255,0.45)' : C.textSub),
        transition: 'background 0.12s, color 0.12s',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: compact ? 14 : 18,
          borderRadius: '0 3px 3px 0', background: C.accent,
        }}/>
      )}
      <span style={{ flexShrink: 0, display: 'flex', opacity: active ? 1 : 0.8 }}>{item.icon}</span>
      {expanded && (
        <span style={{ fontSize: compact ? 12 : 13, fontWeight: active ? 700 : (compact ? 400 : 500), letterSpacing: '-0.1px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {item.label}
        </span>
      )}
    </div>
  )
}

// ── SidebarGroup (grupo colapsable) ──────────────────────────
function SidebarGroup({ item, currentPath, expanded, onNavigate, groupOpen, onToggle }) {
  const anyChildActive = item.children.some(c => isItemActive(c, currentPath))
  const [hovered, setHovered] = useState(false)

  return (
    <div>
      {/* Cabecera del grupo */}
      <div
        onClick={onToggle}
        title={!expanded ? item.label : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: expanded ? '9px 14px' : '9px 0',
          justifyContent: expanded ? 'flex-start' : 'center',
          borderRadius: 9, cursor: 'pointer',
          background: anyChildActive ? C.sidebarActive : hovered ? C.sidebarHover : 'transparent',
          color: anyChildActive ? '#fff' : hovered ? 'rgba(255,255,255,0.85)' : C.textSub,
          transition: 'background 0.12s, color 0.12s',
          position: 'relative', userSelect: 'none',
        }}
      >
        {anyChildActive && (
          <div style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 18, borderRadius: '0 3px 3px 0', background: C.accent,
          }}/>
        )}
        <span style={{ flexShrink: 0, display: 'flex', opacity: anyChildActive ? 1 : 0.8 }}>{item.icon}</span>
        {expanded && (
          <>
            <span style={{ flex: 1, fontSize: 13, fontWeight: anyChildActive ? 700 : 500, letterSpacing: '-0.1px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {item.label}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.28)', display: 'flex', flexShrink: 0 }}>
              {groupOpen ? IcoChevronDown : IcoChevronRight}
            </span>
          </>
        )}
      </div>

      {/* Sub-ítems */}
      {expanded && groupOpen && item.children.map(child => (
        <SidebarItem
          key={child.id}
          item={child}
          active={isItemActive(child, currentPath)}
          expanded={expanded}
          onClick={() => onNavigate(child.path)}
          compact
        />
      ))}
    </div>
  )
}

// ── SIDEBAR DESKTOP ───────────────────────────────────────────
function Sidebar({ expanded, onToggle, items, currentPath, onNavigate, profile, onSignOut, onOpenPerfil }) {
  const W = expanded ? 220 : 60
  const [expandedGroups, setExpandedGroups] = useState(() => {
    // Abre el grupo si algún hijo está activo
    const initial = {}
    items.forEach(i => {
      if (i.group) initial[i.id] = i.children?.some(c => currentPath.startsWith(c.path)) ?? false
    })
    return initial
  })

  function toggleGroup(id) {
    if (!expanded) {
      onToggle() // expande el sidebar primero
      setExpandedGroups(g => ({ ...g, [id]: true }))
    } else {
      setExpandedGroups(g => ({ ...g, [id]: !g[id] }))
    }
  }

  return (
    <div style={{
      width: W, minWidth: W, height: '100vh',
      background: C.sidebar, display: 'flex', flexDirection: 'column',
      flexShrink: 0, transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1), min-width 0.2s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden', borderRight: `1px solid ${C.border}`, zIndex: 50,
    }}>

      {/* Logo + toggle */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: expanded ? 'space-between' : 'center',
        padding: expanded ? '0 14px 0 16px' : '0',
        flexShrink: 0, borderBottom: `1px solid ${C.border}`,
      }}>
        {expanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoCat} alt="CAT" style={{ height: 32, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.92, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>SIGAT</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.04em' }}>DGCAT · GCBA</div>
            </div>
          </div>
        )}
        {!expanded && (
          <img src={logoCat} alt="CAT" style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
        )}
        {expanded && (
          <button onClick={onToggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: expanded ? '12px 10px' : '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {!expanded && (
          <button onClick={onToggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '8px 0', borderRadius: 8, display: 'flex', justifyContent: 'center', marginBottom: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
            title="Expandir menú">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        {items.map(item => {
          if (item.group) {
            return (
              <SidebarGroup
                key={item.id}
                item={item}
                currentPath={currentPath}
                expanded={expanded}
                onNavigate={onNavigate}
                groupOpen={!!expandedGroups[item.id]}
                onToggle={() => toggleGroup(item.id)}
              />
            )
          }
          return (
            <SidebarItem
              key={item.id}
              item={item}
              active={isItemActive(item, currentPath)}
              expanded={expanded}
              onClick={() => onNavigate(item.path)}
            />
          )
        })}
      </nav>

      {/* Footer: perfil + logout */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: expanded ? '12px 10px' : '12px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: expanded ? '8px 10px' : '8px 0', justifyContent: expanded ? 'flex-start' : 'center', borderRadius: 10 }}>
          {/* Avatar clickeable → abre ModalPerfil */}
          <div
            onClick={onOpenPerfil}
            title={expanded ? 'Ver mi perfil' : `${profile?.nombre_completo ?? ''} · Ver perfil`}
            style={{
              width: 30, height: 30, borderRadius: '50%', background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: C.sidebar, flexShrink: 0,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {getInitials(profile?.nombre_completo)}
          </div>
          {expanded && (
            <div
              onClick={onOpenPerfil}
              style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              title="Ver mi perfil"
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.nombre_completo?.split(' ')[0] ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.base_nombre ?? '—'}
              </div>
            </div>
          )}
          {expanded && (
            <button onClick={onSignOut} title="Cerrar sesion"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#e24b4a'}
              onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TOPBAR DESKTOP ────────────────────────────────────────────
function TopbarDesktop({ titulo, accionHeader, subtitulo }) {
  return (
    <div style={{
      height: 56, background: '#fff', borderBottom: '0.5px solid #e0e4ed',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.4px' }}>
          {titulo}
        </div>
        {subtitulo && (
          <div style={{ fontSize: 13, color: '#aeaeb2', fontWeight: 400 }}>{subtitulo}</div>
        )}
      </div>
      {accionHeader && (
        <button onClick={accionHeader.onClick}
          style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          {accionHeader.icon && <span>{accionHeader.icon}</span>}
          {accionHeader.label}
        </button>
      )}
    </div>
  )
}

// ── NAVBAR MOBILE ─────────────────────────────────────────────
function NavbarMobileShell({ items, currentPath, onNavigate }) {
  // Aplanar grupos para mobile y tomar los primeros 4
  const flatItems = flatPaths(items).slice(0, 4)

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(17,24,39,0.97)', backdropFilter: 'blur(16px)',
      borderTop: `1px solid ${C.border}`, padding: '8px 0 20px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100,
    }}>
      {flatItems.map(item => {
        const active = isItemActive(item, currentPath)
        return (
          <div key={item.id} onClick={() => onNavigate(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 16px', color: active ? C.accent : C.textMuted, transition: 'color 0.15s' }}>
            <span style={{ display: 'flex' }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>
              {item.label.split(' ')[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── NOTIFICACIONES (campanita + popover) ──────────────────────
const TIPO_EVENTO = {
  mision_creada:       { label: 'Nueva misión',  color: '#185fa5', bg: '#e8f0fe' },
  mision_asignada:     { label: 'Asignada',       color: '#854f0b', bg: '#faeeda' },
  mision_aceptada:     { label: 'Aceptada',       color: '#0f6e56', bg: '#e8faf2' },
  mision_interrumpida: { label: 'Interrumpida',   color: '#854f0b', bg: '#faeeda' },
  mision_cerrada:      { label: 'Cerrada',        color: '#0f6e56', bg: '#e8faf2' },
  servicio_generado:   { label: 'Nuevo servicio', color: '#534ab7', bg: '#eeedf8' },
}

function tiempoRel(fecha) {
  if (!fecha) return ''
  const diff = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (diff < 1)    return 'ahora'
  if (diff < 60)   return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`
  return `hace ${Math.floor(diff / 1440)} d`
}

function NotificacionesBell({ rol, isMobile }) {
  const [open, setOpen]         = useState(false)
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [ultVista, setUltVista] = useState(() => {
    try { return parseInt(localStorage.getItem('cat_act_ult_vista')) || 0 } catch { return 0 }
  })
  const popRef = useRef(null)

  useEffect(() => {
    if (rol === 'agente') return
    setLoading(true)
    api.get('/api/actividad?limite=20')
      .then(d => setItems(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rol])

  // Cerrar al click afuera (desktop)
  useEffect(() => {
    if (!open || isMobile) return
    const fn = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open, isMobile])

  // Bloquear scroll body cuando el sheet mobile está abierto
  useEffect(() => {
    if (open && isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open, isMobile])

  if (rol === 'agente') return null

  const noLeidos = items.filter(a => new Date(a.created_at).getTime() > ultVista).length

  function abrir() {
    setOpen(true)
    const now = Date.now()
    setUltVista(now)
    try { localStorage.setItem('cat_act_ult_vista', String(now)) } catch {}
  }

  const lista = (
    <>
      {loading && <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#aeaeb2' }}>Cargando...</div>}
      {!loading && items.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', marginBottom: 4 }}>Sin actividad reciente</div>
          <div style={{ fontSize: 12, color: '#aeaeb2' }}>Las notificaciones del sistema aparecerán aquí</div>
        </div>
      )}
      {!loading && items.map((a, i) => {
        const tipo = TIPO_EVENTO[a.tipo] ?? { label: a.tipo, color: '#636366', bg: '#f5f5f7' }
        return (
          <div key={a.id || i} style={{ padding: '12px 16px', borderBottom: i < items.length - 1 ? '0.5px solid #f0f0f5' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>{a.descripcion}</span>
              <span style={{ fontSize: 10, color: '#aeaeb2', flexShrink: 0, whiteSpace: 'nowrap' }}>{tiempoRel(a.created_at)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: tipo.bg, color: tipo.color }}>{tipo.label}</span>
              {a.nombre_completo && <span style={{ fontSize: 11, color: '#8e8e93' }}>{a.nombre_completo}</span>}
            </div>
          </div>
        )
      })}
    </>
  )

  return (
    <div style={{ position: 'relative' }} ref={popRef}>
      <button
        onClick={() => open ? setOpen(false) : abrir()}
        title="Actividad reciente"
        style={{
          background: open ? 'rgba(255,255,255,0.12)' : 'transparent',
          border: 'none', cursor: 'pointer', color: '#fff',
          width: 38, height: 38, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {noLeidos > 0 && (
          <div style={{
            position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, padding: '0 4px',
            background: '#e24b4a', borderRadius: 8, fontSize: 9, fontWeight: 800,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid ' + C.sidebar, boxSizing: 'content-box',
          }}>{noLeidos > 9 ? '9+' : noLeidos}</div>
        )}
      </button>

      {/* Desktop: dropdown */}
      {open && !isMobile && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 360, maxHeight: '70vh', overflow: 'auto',
          background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          border: '0.5px solid #e0e4ed', zIndex: 200,
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Actividad reciente</span>
            {items.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#1a2744', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>}
          </div>
          {lista}
        </div>
      )}

      {/* Mobile: sheet */}
      {open && isMobile && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 250 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 251,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#dde2ec' }} />
            </div>
            <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #f0f0f5' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1a2744' }}>Actividad reciente</span>
              <button onClick={() => setOpen(false)} style={{ background: '#eef1f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#636366', cursor: 'pointer' }}>Cerrar</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>{lista}</div>
          </div>
        </>
      )}
    </div>
  )
}

// ── DRAWER MOBILE (sidebar overlay) ───────────────────────────
function MobileDrawer({ open, onClose, items, currentPath, onNavigate, profile, onSignOut, onOpenPerfil }) {
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {}
    items.forEach(i => { if (i.group) initial[i.id] = i.children?.some(c => currentPath.startsWith(c.path)) ?? false })
    return initial
  })

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, onClose])

  // Bloquear scroll body
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  function go(path) { onNavigate(path); onClose() }
  function toggleGroup(id) { setExpandedGroups(g => ({ ...g, [id]: !g[id] })) }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 300, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 280, maxWidth: '85vw', background: C.sidebar, zIndex: 301,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: open ? '4px 0 30px rgba(0,0,0,0.3)' : 'none',
        paddingTop: 'env(safe-area-inset-top, 0)',
      }}>
        {/* Header del drawer con logos */}
        <div style={{ padding: '18px 18px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logoCat} alt="CAT" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
          <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.18)' }} />
          <img src={logoBa} alt="BA Ciudad" style={{ height: 22, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 8, padding: 6, display: 'flex' }}
            title="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Brand text */}
        <div style={{ padding: '12px 18px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>SIGAT</div>
          <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.04em' }}>DGCAT · GCBA</div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
          {items.map(item => {
            if (item.group) {
              const anyChildActive = item.children.some(c => isItemActive(c, currentPath))
              const open = !!expandedGroups[item.id]
              return (
                <div key={item.id}>
                  <div
                    onClick={() => toggleGroup(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px',
                      borderRadius: 9, cursor: 'pointer',
                      background: anyChildActive ? C.sidebarActive : 'transparent',
                      color: anyChildActive ? '#fff' : C.textSub,
                      position: 'relative',
                    }}
                  >
                    {anyChildActive && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 3px 3px 0', background: C.accent }} />}
                    <span style={{ display: 'flex', opacity: anyChildActive ? 1 : 0.8 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: anyChildActive ? 700 : 500 }}>{item.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.28)', display: 'flex' }}>{open ? IcoChevronDown : IcoChevronRight}</span>
                  </div>
                  {open && item.children.map(child => {
                    const active = isItemActive(child, currentPath)
                    return (
                      <div key={child.id} onClick={() => go(child.path)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px 8px 32px',
                          borderRadius: 9, cursor: 'pointer',
                          background: active ? C.sidebarActive : 'transparent',
                          color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                          position: 'relative',
                        }}>
                        {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 14, borderRadius: '0 3px 3px 0', background: C.accent }} />}
                        <span style={{ display: 'flex', opacity: active ? 1 : 0.8 }}>{child.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: active ? 700 : 400 }}>{child.label}</span>
                      </div>
                    )
                  })}
                </div>
              )
            }
            const active = isItemActive(item, currentPath)
            return (
              <div key={item.id} onClick={() => go(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px',
                  borderRadius: 9, cursor: 'pointer',
                  background: active ? C.sidebarActive : 'transparent',
                  color: active ? '#fff' : C.textSub,
                  position: 'relative',
                }}>
                {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 3px 3px 0', background: C.accent }} />}
                <span style={{ display: 'flex', opacity: active ? 1 : 0.8 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </div>
            )
          })}
        </nav>

        {/* Footer: perfil + logout */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
          <div
            onClick={() => { onClose(); onOpenPerfil() }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.sidebar, cursor: 'pointer', flexShrink: 0 }}
          >
            {getInitials(profile?.nombre_completo)}
          </div>
          <div
            onClick={() => { onClose(); onOpenPerfil() }}
            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.nombre_completo ?? '—'}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{profile?.base_nombre ?? '—'}</div>
          </div>
          <button onClick={onSignOut} title="Cerrar sesión"
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 8, borderRadius: 8, display: 'flex', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

// ── APP SHELL (componente principal) ─────────────────────────
export default function AppShell({ children, titulo, accionHeader }) {
  const { profile, signOut, tienePermiso } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('cat_sidebar') !== 'collapsed' } catch { return true }
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [mostrarPerfil, setMostrarPerfil] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  function toggleSidebar() {
    setExpanded(v => {
      const next = !v
      try { localStorage.setItem('cat_sidebar', next ? 'expanded' : 'collapsed') } catch {}
      return next
    })
  }

  const items = filterNavItems(NAV_ITEMS, tienePermiso ?? (() => false))

  // Titulo: desde prop o inferido de la ruta activa (buscando en items aplanados)
  const tituloActual = titulo ?? (
    flatPaths(items).find(i => isItemActive(i, location.pathname))?.label ?? 'Plataforma CAT'
  )

  if (isMobile) {
    const rol = profile?.role ?? 'agente'
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        {mostrarPerfil && (
          <ModalPerfil
            perfil={profile}
            onClose={() => setMostrarPerfil(false)}
            titulo="Mi perfil"
          />
        )}

        {/* Header mobile */}
        <div style={{
          background: C.sidebar,
          paddingTop: 'env(safe-area-inset-top, 0)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{
            height: 56, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 8px 0 4px', gap: 6,
          }}>
            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              title="Menú"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#fff', width: 42, height: 42, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* Logo + título */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <img src={logoCat} alt="CAT" style={{ height: 26, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95, flexShrink: 0 }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tituloActual}
              </span>
            </div>

            {/* Acción contextual + bell + avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {accionHeader && (
                <button
                  onClick={accionHeader.onClick}
                  title={accionHeader.label}
                  style={{
                    background: C.accent, border: 'none', borderRadius: 10,
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sidebar} strokeWidth="2.6" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              )}

              <NotificacionesBell rol={rol} isMobile />

              <button
                onClick={() => setMostrarPerfil(true)}
                title="Mi perfil"
                style={{
                  background: C.accent, border: 'none', borderRadius: '50%',
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: C.sidebar, cursor: 'pointer', flexShrink: 0,
                  marginLeft: 4,
                }}
              >
                {getInitials(profile?.nombre_completo)}
              </button>
            </div>
          </div>
        </div>

        {/* Drawer overlay */}
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          items={items}
          currentPath={location.pathname}
          onNavigate={navigate}
          profile={profile}
          onSignOut={signOut}
          onOpenPerfil={() => setMostrarPerfil(true)}
        />

        {children}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
      {mostrarPerfil && (
        <ModalPerfil
          perfil={profile}
          onClose={() => setMostrarPerfil(false)}
          titulo="Mi perfil"
        />
      )}
      <Sidebar
        expanded={expanded}
        onToggle={toggleSidebar}
        items={items}
        currentPath={location.pathname}
        onNavigate={navigate}
        profile={profile}
        onSignOut={signOut}
        onOpenPerfil={() => setMostrarPerfil(true)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopbarDesktop
          titulo={tituloActual}
          accionHeader={accionHeader}
          subtitulo={location.pathname === '/' ? new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}
        />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
