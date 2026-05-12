-- =============================================================
-- SIGAT — Schema completo
-- Actualizado: 2026-05-12
-- Ejecutar en una base de datos PostgreSQL vacía llamada cat_plataforma
-- =============================================================

-- -------------------------------------------------------------
-- EXTENSIONES
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- BLOQUE 1 — TABLAS BASE
-- =============================================================

-- -------------------------------------------------------------
-- 1. BASES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bases (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    TEXT NOT NULL,
  direccion TEXT,
  activa    BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 2. PROFILES (usuarios)
-- Incluye columnas de nómina, cobros y configuración regional.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  -- role se conserva por compatibilidad; la autorización real usa la tabla rol_permisos
  role             TEXT NOT NULL CHECK (role IN (
    'gerencia','jefe_base','coordinador','supervisor','agente','admin',
    'director','planeamiento','jefe_cgm','coordinador_cgm',
    'operador_adicionales','operador_disciplinario'
  )),
  base_id          UUID REFERENCES bases(id),
  turno            TEXT,
  legajo           TEXT UNIQUE,
  nombre_completo  TEXT NOT NULL,
  activo           BOOLEAN DEFAULT true,

  -- Nómina / RRHH
  cuil             TEXT,
  cargo            TEXT,
  funcion          TEXT,
  funcion_especifica TEXT,
  tipo_contrato    TEXT,
  fecha_nacimiento DATE,
  hora_entrada     TIME,
  hora_salida      TIME,
  telefono         TEXT,
  telefono_ht      TEXT,
  area             TEXT,

  -- Cobros / LOYS
  loys             BOOLEAN NOT NULL DEFAULT false,
  cbu              VARCHAR(22),

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cuil_unique ON profiles (cuil) WHERE cuil IS NOT NULL;

-- =============================================================
-- BLOQUE 2 — RBAC DINÁMICO
-- =============================================================

-- -------------------------------------------------------------
-- 3. ROLES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  key         VARCHAR(60) PRIMARY KEY,
  label       TEXT NOT NULL,
  descripcion TEXT    DEFAULT '',
  color       TEXT    DEFAULT '#636366',
  bg          TEXT    DEFAULT '#f5f5f7',
  es_sistema  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (key, label, descripcion, color, bg, es_sistema) VALUES
  ('admin',                 'Admin',                  'Acceso total al sistema',                                  '#636366', '#f5f5f7', true),
  ('gerencia',              'Gerencia',               'Aprueba presupuestos, facturas y configuración',           '#1a2744', '#eef1f8', true),
  ('director',              'Director',               'Aprueba presupuestos y liquidaciones',                     '#185fa5', '#e8f0fe', true),
  ('jefe_base',             'Jefe de base',           'Gestión operativa de su base',                            '#0f6e56', '#e8faf2', true),
  ('jefe_cgm',              'Jefe CGM',               'Acceso a SS.AA., OS adicional y presupuestos',            '#0369a1', '#e0f2fe', true),
  ('coordinador',           'Coordinador',            'Asignación y seguimiento de misiones',                    '#534ab7', '#eeecff', true),
  ('coordinador_cgm',       'Coordinador CGM',        'Gestión de OS adicional',                                 '#6d28d9', '#f0ebff', true),
  ('planeamiento',          'Planeamiento',           'Acceso a órdenes de servicio',                            '#854f0b', '#fff8e6', true),
  ('operador_adicionales',  'Operador SS.AA.',        'Gestión completa de servicios adicionales y facturación', '#c47f00', '#fffbe6', true),
  ('operador_disciplinario','Operador disciplinario', 'Gestión de sanciones',                                    '#b91c1c', '#fef2f2', true),
  ('supervisor',            'Supervisor',             'Asignación de misiones en campo',                         '#4338ca', '#eef2ff', true),
  ('agente',                'Agente',                 'Solo ve sus propias misiones',                            '#8e8e93', '#f5f5f7', true)
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------------
-- 4. ROL_PERMISOS (RBAC dinámico)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol_permisos (
  rol         VARCHAR(60) NOT NULL,
  permiso_key VARCHAR(60) NOT NULL,
  PRIMARY KEY (rol, permiso_key)
);

-- Permisos por defecto por rol (no sobreescribe cambios manuales)
INSERT INTO rol_permisos (rol, permiso_key) VALUES
  -- admin: todos
  ('admin','MISIONES_CREAR'),('admin','MISIONES_ASIGNAR'),
  ('admin','OS_CREAR'),('admin','OS_ELIMINAR'),('admin','OS_VALIDAR'),
  ('admin','PRESUPUESTOS_CREAR'),('admin','PRESUPUESTOS_APROBAR'),('admin','PRESUPUESTOS_RECHAZAR'),
  ('admin','PRESUPUESTOS_ELIMINAR'),('admin','PRESUPUESTOS_MODIFICAR_APROBADO'),
  ('admin','SSAA_CREAR'),('admin','SSAA_AVANZAR_ESTADO'),('admin','SSAA_POSTULANTES'),
  ('admin','SSAA_ARMADO'),('admin','SSAA_CONVOCATORIA'),('admin','SSAA_PRESENTISMO'),
  ('admin','SSAA_CONFIG_SCORING'),('admin','SSAA_REVISAR_CAMBIOS'),
  ('admin','SERVICIOS_CARGAR_BUI'),('admin','SERVICIOS_MARCAR_BUI_PAGADA'),
  ('admin','SERVICIOS_CANCELAR'),('admin','SERVICIOS_VINCULAR_OS'),('admin','SERVICIOS_SOLICITAR_FACTURAS'),
  ('admin','COBROS_NUEVA_LIQUIDACION'),('admin','COBROS_ACTUALIZAR_UF'),
  ('admin','FACTURACION_APROBAR'),('admin','FACTURACION_RECHAZAR'),
  ('admin','FACTURACION_SUBSANAR'),('admin','FACTURACION_CONFIG_SMTP'),
  ('admin','ADMIN_USUARIOS'),('admin','ADMIN_IMPORTAR_NOMINA'),
  ('admin','VER_MISIONES'),('admin','VER_OS'),('admin','VER_OS_ADICIONAL'),('admin','VER_SSAA'),
  ('admin','VER_SERVICIOS'),('admin','VER_PRESUPUESTOS'),('admin','VER_COBROS'),
  ('admin','VER_FACTURACION'),('admin','VER_EQUIPO'),('admin','VER_NOMINA'),
  -- gerencia
  ('gerencia','MISIONES_CREAR'),('gerencia','MISIONES_ASIGNAR'),
  ('gerencia','OS_CREAR'),('gerencia','OS_ELIMINAR'),('gerencia','OS_VALIDAR'),
  ('gerencia','PRESUPUESTOS_CREAR'),('gerencia','PRESUPUESTOS_APROBAR'),('gerencia','PRESUPUESTOS_RECHAZAR'),
  ('gerencia','PRESUPUESTOS_ELIMINAR'),('gerencia','PRESUPUESTOS_MODIFICAR_APROBADO'),
  ('gerencia','SSAA_CREAR'),('gerencia','SSAA_AVANZAR_ESTADO'),
  ('gerencia','SSAA_POSTULANTES'),('gerencia','SSAA_ARMADO'),('gerencia','SSAA_CONVOCATORIA'),
  ('gerencia','SSAA_PRESENTISMO'),('gerencia','SSAA_CONFIG_SCORING'),
  ('gerencia','SERVICIOS_CARGAR_BUI'),('gerencia','SERVICIOS_MARCAR_BUI_PAGADA'),
  ('gerencia','SERVICIOS_CANCELAR'),('gerencia','SERVICIOS_VINCULAR_OS'),('gerencia','SERVICIOS_SOLICITAR_FACTURAS'),
  ('gerencia','COBROS_NUEVA_LIQUIDACION'),('gerencia','COBROS_ACTUALIZAR_UF'),
  ('gerencia','FACTURACION_APROBAR'),('gerencia','FACTURACION_RECHAZAR'),('gerencia','FACTURACION_SUBSANAR'),
  ('gerencia','VER_MISIONES'),('gerencia','VER_OS'),('gerencia','VER_OS_ADICIONAL'),('gerencia','VER_SSAA'),
  ('gerencia','VER_SERVICIOS'),('gerencia','VER_PRESUPUESTOS'),('gerencia','VER_COBROS'),
  ('gerencia','VER_FACTURACION'),('gerencia','VER_EQUIPO'),('gerencia','VER_NOMINA'),
  -- director
  ('director','OS_CREAR'),('director','OS_VALIDAR'),
  ('director','PRESUPUESTOS_APROBAR'),('director','PRESUPUESTOS_RECHAZAR'),('director','PRESUPUESTOS_MODIFICAR_APROBADO'),
  ('director','SSAA_CONFIG_SCORING'),
  ('director','COBROS_NUEVA_LIQUIDACION'),
  ('director','FACTURACION_APROBAR'),('director','FACTURACION_RECHAZAR'),
  ('director','VER_OS'),('director','VER_OS_ADICIONAL'),('director','VER_SSAA'),
  ('director','VER_SERVICIOS'),('director','VER_PRESUPUESTOS'),('director','VER_COBROS'),('director','VER_FACTURACION'),
  -- jefe_base
  ('jefe_base','MISIONES_CREAR'),('jefe_base','MISIONES_ASIGNAR'),
  ('jefe_base','OS_CREAR'),
  ('jefe_base','VER_MISIONES'),('jefe_base','VER_OS'),('jefe_base','VER_EQUIPO'),('jefe_base','VER_NOMINA'),
  -- jefe_cgm
  ('jefe_cgm','OS_CREAR'),('jefe_cgm','OS_VALIDAR'),
  ('jefe_cgm','PRESUPUESTOS_CREAR'),
  ('jefe_cgm','SSAA_CREAR'),('jefe_cgm','SSAA_AVANZAR_ESTADO'),
  ('jefe_cgm','SSAA_POSTULANTES'),('jefe_cgm','SSAA_ARMADO'),('jefe_cgm','SSAA_CONVOCATORIA'),
  ('jefe_cgm','SSAA_PRESENTISMO'),('jefe_cgm','SSAA_CONFIG_SCORING'),('jefe_cgm','SSAA_REVISAR_CAMBIOS'),
  ('jefe_cgm','SERVICIOS_CARGAR_BUI'),('jefe_cgm','SERVICIOS_VINCULAR_OS'),
  ('jefe_cgm','VER_OS'),('jefe_cgm','VER_OS_ADICIONAL'),('jefe_cgm','VER_SSAA'),
  ('jefe_cgm','VER_SERVICIOS'),('jefe_cgm','VER_PRESUPUESTOS'),('jefe_cgm','VER_EQUIPO'),('jefe_cgm','VER_NOMINA'),
  -- coordinador
  ('coordinador','MISIONES_ASIGNAR'),
  ('coordinador','VER_MISIONES'),('coordinador','VER_EQUIPO'),
  -- coordinador_cgm
  ('coordinador_cgm','OS_CREAR'),
  ('coordinador_cgm','SSAA_ARMADO'),('coordinador_cgm','SSAA_CONVOCATORIA'),('coordinador_cgm','SSAA_PRESENTISMO'),
  ('coordinador_cgm','VER_OS'),('coordinador_cgm','VER_OS_ADICIONAL'),('coordinador_cgm','VER_SSAA'),
  -- planeamiento
  ('planeamiento','OS_CREAR'),
  ('planeamiento','VER_OS'),
  -- operador_adicionales
  ('operador_adicionales','PRESUPUESTOS_CREAR'),('operador_adicionales','PRESUPUESTOS_MODIFICAR_APROBADO'),
  ('operador_adicionales','SSAA_CREAR'),('operador_adicionales','SSAA_AVANZAR_ESTADO'),
  ('operador_adicionales','SSAA_POSTULANTES'),('operador_adicionales','SSAA_ARMADO'),
  ('operador_adicionales','SSAA_CONVOCATORIA'),('operador_adicionales','SSAA_PRESENTISMO'),
  ('operador_adicionales','SSAA_CONFIG_SCORING'),('operador_adicionales','SSAA_REVISAR_CAMBIOS'),
  ('operador_adicionales','SERVICIOS_CARGAR_BUI'),('operador_adicionales','SERVICIOS_VINCULAR_OS'),
  ('operador_adicionales','SERVICIOS_SOLICITAR_FACTURAS'),
  ('operador_adicionales','COBROS_NUEVA_LIQUIDACION'),
  ('operador_adicionales','FACTURACION_SUBSANAR'),
  ('operador_adicionales','VER_SSAA'),('operador_adicionales','VER_OS_ADICIONAL'),
  ('operador_adicionales','VER_SERVICIOS'),('operador_adicionales','VER_PRESUPUESTOS'),
  ('operador_adicionales','VER_COBROS'),('operador_adicionales','VER_FACTURACION'),
  -- supervisor
  ('supervisor','MISIONES_ASIGNAR'),('supervisor','VER_MISIONES'),('supervisor','VER_EQUIPO'),
  -- agente
  ('agente','VER_MISIONES')
ON CONFLICT DO NOTHING;

-- =============================================================
-- BLOQUE 3 — ÓRDENES DE SERVICIO ORDINARIAS
-- =============================================================

-- -------------------------------------------------------------
-- 5. ORDENES_SERVICIO
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          SERIAL,
  tipo            TEXT NOT NULL DEFAULT 'ordinaria'
                    CHECK (tipo IN ('ordinaria','adicional','alcoholemia')),
  base_id         UUID REFERENCES bases(id) NOT NULL,
  titulo          TEXT NOT NULL,
  semana_inicio   DATE,
  semana_fin      DATE,
  vigencia_inicio TIMESTAMPTZ,
  vigencia_fin    TIMESTAMPTZ,
  estado          TEXT NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador','validacion','vigente','cumplida')),
  creado_por      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 6. OS_ITEMS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id            UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
  tipo             TEXT NOT NULL CHECK (tipo IN ('servicio','mision')),
  codigo           TEXT NOT NULL,
  descripcion      TEXT NOT NULL,
  turno            TEXT NOT NULL,
  modo_ubicacion   TEXT DEFAULT 'altura'
                     CHECK (modo_ubicacion IN ('altura','interseccion','entre_calles','poligono')),
  calle            TEXT,
  altura           TEXT,
  calle2           TEXT,
  desde            TEXT,
  hasta            TEXT,
  poligono_desc    TEXT,
  poligono_coords  JSONB,
  eje_psv          TEXT,
  es_mision        BOOLEAN DEFAULT false,
  cantidad_agentes JSONB DEFAULT '{}',
  relevo_tipo      TEXT CHECK (relevo_tipo IN ('Normal','En zona')),
  relevo_base_id   UUID REFERENCES bases(id),
  relevo_turno     TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  place_id         TEXT,
  instrucciones    TEXT,
  comuna           TEXT,
  barrio           TEXT,
  orden            INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 7. CADENA DE TURNOS Y RELEVOS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_item_turnos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id       UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  orden            INTEGER NOT NULL DEFAULT 0,
  turno            TEXT NOT NULL,
  base_id          UUID REFERENCES bases(id),
  cantidad_agentes INTEGER NOT NULL DEFAULT 1,
  coordinador_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_os_item_turnos_item ON os_item_turnos(os_item_id);

CREATE TABLE IF NOT EXISTS os_item_relevos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  orden      INTEGER NOT NULL DEFAULT 0,
  tipo       TEXT NOT NULL DEFAULT 'Normal' CHECK (tipo IN ('Normal','En zona')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_os_item_relevos_item ON os_item_relevos(os_item_id);

-- -------------------------------------------------------------
-- 8. FECHAS POR ITEM Y POR OS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_item_fechas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  fecha      DATE NOT NULL,
  UNIQUE(os_item_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_os_item_fechas_item  ON os_item_fechas(os_item_id);
CREATE INDEX IF NOT EXISTS idx_os_item_fechas_fecha ON os_item_fechas(fecha);

CREATE TABLE IF NOT EXISTS os_fechas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id       UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
  fecha       DATE NOT NULL,
  hora_inicio TIME,
  hora_fin    TIME,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 9. MISIONES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS misiones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id     UUID REFERENCES os_items(id) ON DELETE SET NULL,
  base_id        UUID REFERENCES bases(id) NOT NULL,
  titulo         TEXT NOT NULL,
  descripcion    TEXT,
  turno          TEXT NOT NULL,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  estado         TEXT NOT NULL DEFAULT 'sin_asignar'
                   CHECK (estado IN ('sin_asignar','asignada','en_mision','interrumpida','cerrada')),
  modo_ubicacion TEXT DEFAULT 'altura',
  calle          TEXT,
  altura         TEXT,
  calle2         TEXT,
  desde          TEXT,
  hasta          TEXT,
  poligono_desc  TEXT,
  eje_psv        TEXT,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  encargado_id   UUID REFERENCES profiles(id),
  fotos          TEXT[] DEFAULT '{}',
  observaciones  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mision_agentes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mision_id    UUID REFERENCES misiones(id) ON DELETE CASCADE NOT NULL,
  agente_id    UUID REFERENCES profiles(id) NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'asignado'
                 CHECK (estado IN ('asignado','en_mision','libre')),
  es_encargado BOOLEAN DEFAULT false,
  asignado_at  TIMESTAMPTZ DEFAULT NOW(),
  aceptado_at  TIMESTAMPTZ,
  UNIQUE(mision_id, agente_id)
);

CREATE TABLE IF NOT EXISTS interrupciones (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mision_id UUID REFERENCES misiones(id) ON DELETE CASCADE NOT NULL,
  agente_id UUID REFERENCES profiles(id) NOT NULL,
  motivo    TEXT NOT NULL,
  inicio    TIMESTAMPTZ DEFAULT NOW(),
  fin       TIMESTAMPTZ,
  activa    BOOLEAN DEFAULT true
);

-- -------------------------------------------------------------
-- 10. ACTIVIDAD / LOG
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividad (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id     UUID REFERENCES bases(id),
  mision_id   UUID REFERENCES misiones(id) ON DELETE SET NULL,
  agente_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 11. TOKENS DE SESIÓN
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti        UUID PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- -------------------------------------------------------------
-- 12. GRUPOS Y ACCESOS ALCOHOLEMIA
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  modulo      TEXT DEFAULT '*',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupo_reglas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id  UUID REFERENCES grupos(id) ON DELETE CASCADE NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('base','role','profile')),
  valor     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_alcoholemia_accesos (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id   UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
  tipo    TEXT NOT NULL CHECK (tipo IN ('base','role','profile','grupo')),
  valor   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- BLOQUE 4 — PIPELINE DE SERVICIOS (Presupuesto → Servicio → SA)
-- =============================================================

-- -------------------------------------------------------------
-- 13. BENEFICIARIOS (personas/empresas que contratan servicios)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficiarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(255) NOT NULL,
  nombre       VARCHAR(255),
  email        VARCHAR(255),
  telefono     VARCHAR(50),
  cuit         VARCHAR(20),
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beneficiario_documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id UUID NOT NULL REFERENCES beneficiarios(id) ON DELETE CASCADE,
  nombre          VARCHAR(255) NOT NULL,
  nombre_archivo  VARCHAR(255) NOT NULL,
  tipo_mime       VARCHAR(100),
  tamanio         INTEGER,
  subido_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beneficiario_documentos_benef ON beneficiario_documentos(beneficiario_id);

-- -------------------------------------------------------------
-- 14. PRESUPUESTOS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presupuestos (
  id              SERIAL PRIMARY KEY,
  numero          VARCHAR(20) UNIQUE NOT NULL,
  -- Número generado por trigger: PRES-YYYY-NNN (ej: PRES-2026-001)
  beneficiario    VARCHAR(255) NOT NULL,
  beneficiario_id UUID REFERENCES beneficiarios(id) ON DELETE SET NULL,
  evento          VARCHAR(255) NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador','enviado','aprobado','rechazado','vencido','cancelado')),
  valor_modulo    NUMERIC(12,2) NOT NULL DEFAULT 71249.25,
  validez_dias    INT NOT NULL DEFAULT 3,
  items           JSONB NOT NULL DEFAULT '[]',
  -- items: [{dia, cobertura, horario, personal, modulos}]
  observaciones   TEXT,
  -- BUI (Boleta Única de Ingreso)
  bui_numero      TEXT,
  bui_archivo     TEXT,
  bui_comp_numero TEXT,
  bui_comp_archivo TEXT,
  creado_por      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_presupuestos_beneficiario_id ON presupuestos(beneficiario_id);

-- Trigger: número correlativo por año → PRES-YYYY-NNN
CREATE OR REPLACE FUNCTION fn_generar_numero_presupuesto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  anio INT := EXTRACT(YEAR FROM NOW());
  seq  INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero, '-', 3) AS INT)
  ), 0) + 1
  INTO seq
  FROM presupuestos
  WHERE numero LIKE 'PRES-' || anio || '-%';

  NEW.numero := 'PRES-' || anio || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presupuesto_numero ON presupuestos;
CREATE TRIGGER trg_presupuesto_numero
  BEFORE INSERT ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_presupuesto();

-- -------------------------------------------------------------
-- 15. SERVICIOS (pipeline principal)
-- Un servicio agrupa: presupuesto → OS adicional → SA → cobro
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_servicio  TEXT NOT NULL,
  -- Formato YY-N (ej: 26-1). Generado por la app con advisory lock.
  presupuesto_id   INTEGER REFERENCES presupuestos(id) ON DELETE SET NULL,
  creado_por       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  estado           TEXT NOT NULL DEFAULT 'activo'
                     CHECK (estado IN ('activo','cancelado')),
  bui_pagada       BOOLEAN NOT NULL DEFAULT false,
  cancelado_at     TIMESTAMPTZ,
  cancelado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicio_documentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id    UUID REFERENCES servicios(id) ON DELETE CASCADE NOT NULL,
  tipo           TEXT,
  nombre         TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tipo_mime      TEXT,
  tamanio        INTEGER,
  subido_por     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_servicio_documentos_servicio ON servicio_documentos(servicio_id);

-- =============================================================
-- BLOQUE 5 — OS ADICIONAL
-- =============================================================

-- -------------------------------------------------------------
-- 16. OS ADICIONAL (cabecera del operativo)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                TEXT NOT NULL,
  evento_motivo         TEXT,
  estado                TEXT NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador','validacion','validada','rechazada','cumplida','cancelada')),
  base_id               UUID REFERENCES bases(id) ON DELETE SET NULL,
  creado_por            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  horario_desde         TIME,
  horario_hasta         TIME,
  dotacion_agentes      INTEGER DEFAULT 0,
  dotacion_supervisores INTEGER DEFAULT 0,
  dotacion_motorizados  INTEGER DEFAULT 0,
  observaciones         TEXT,
  validado_por          UUID REFERENCES profiles(id),
  validado_at           TIMESTAMPTZ,
  obs_rechazo           TEXT,
  -- Vínculo con el pipeline de servicios
  servicio_id           UUID REFERENCES servicios(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 17. FECHAS DE OS ADICIONAL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_fechas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
  fecha           DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 18. RECURSOS DE OS ADICIONAL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_recursos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
  tipo            TEXT NOT NULL,
  cantidad        INTEGER NOT NULL DEFAULT 0,
  descripcion     TEXT,
  categoria       TEXT NOT NULL DEFAULT 'elemento'
                    CHECK (categoria IN ('vehiculo','elemento')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 19. ZONAS Y ELEMENTOS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_zonas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  orden           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_adicional_elementos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id     UUID REFERENCES os_adicional_zonas(id) ON DELETE CASCADE,
  fase_id     UUID,   -- FK añadida luego de crear os_adicional_fases
  tipo        TEXT NOT NULL CHECK (tipo IN ('punto_control','tramo','zona_area','desvio')),
  nombre      TEXT,
  instruccion TEXT,
  geometria   JSONB NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_elementos_fase_id ON os_adicional_elementos(fase_id);

-- -------------------------------------------------------------
-- 20. TURNOS DE OS ADICIONAL
-- Incluye todos los roles de dotación (dotacion_coordinadores, etc.)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_turnos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id           UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
  nombre                    TEXT,
  fecha                     DATE,
  hora_inicio               TIME,
  hora_fin                  TIME,
  dotacion_agentes          INTEGER NOT NULL DEFAULT 0,
  dotacion_supervisores     INTEGER NOT NULL DEFAULT 0,
  dotacion_choferes         INTEGER NOT NULL DEFAULT 0,
  dotacion_motorizados      INTEGER NOT NULL DEFAULT 0,
  dotacion_choferes_gruas   INTEGER NOT NULL DEFAULT 0,
  dotacion_coordinadores    INTEGER NOT NULL DEFAULT 0,
  dotacion_jefes_operativo  INTEGER NOT NULL DEFAULT 0,
  orden                     INTEGER DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_os_adicional_turnos_os ON os_adicional_turnos(os_adicional_id);

-- -------------------------------------------------------------
-- 21. FASES DE OS ADICIONAL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_fases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
  turno_id        UUID REFERENCES os_adicional_turnos(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  fecha           DATE,
  horario_desde   TIME,
  horario_hasta   TIME,
  color           TEXT NOT NULL DEFAULT '#e24b4a',
  orden           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_os_adicional_fases_turno ON os_adicional_fases(turno_id);

-- FK de elementos → fases (declarada acá porque fases se crea primero)
ALTER TABLE os_adicional_elementos
  ADD CONSTRAINT fk_elementos_fase
  FOREIGN KEY (fase_id) REFERENCES os_adicional_fases(id) ON DELETE CASCADE;

-- -------------------------------------------------------------
-- 22. FASE-ZONAS (N:M con datos operativos)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_fase_zonas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id               UUID REFERENCES os_adicional_fases(id) ON DELETE CASCADE NOT NULL,
  zona_id               UUID REFERENCES os_adicional_zonas(id) ON DELETE CASCADE NOT NULL,
  tipo_operacion        TEXT CHECK (tipo_operacion IN (
    'ingreso','egreso','control','corte','desvio',
    'contracarril','estacionamiento','refuerzo','otro'
  )),
  dotacion_agentes      INTEGER DEFAULT 0,
  dotacion_supervisores INTEGER DEFAULT 0,
  dotacion_motorizados  INTEGER DEFAULT 0,
  instrucciones         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fase_id, zona_id)
);

-- =============================================================
-- BLOQUE 6 — SERVICIOS ADICIONALES (gestión, armado, convocatoria)
-- =============================================================

-- -------------------------------------------------------------
-- 23. SERVICIOS_ADICIONALES (SA — gestión de un operativo concreto)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios_adicionales (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id          UUID REFERENCES os_adicional(id) ON DELETE SET NULL,
  -- Vínculo directo al pipeline (cuando se crea sin OS)
  servicio_id              UUID REFERENCES servicios(id) ON DELETE SET NULL,
  estado                   TEXT NOT NULL DEFAULT 'pendiente'
                             CHECK (estado IN ('pendiente','en_gestion','convocado','en_curso','cerrado','cancelado')),
  fecha_servicio           DATE,
  hora_inicio              TIME,
  hora_fin                 TIME,
  modulos_calculados       INTEGER,
  observaciones            TEXT,
  -- Campos para SA creada directamente (sin pipeline presupuesto)
  sa_nombre                TEXT,
  sa_evento                TEXT,
  sa_base_id               UUID REFERENCES bases(id),
  sa_horario_desde         TIME,
  sa_horario_hasta         TIME,
  sa_dotacion_agentes      INTEGER NOT NULL DEFAULT 0,
  sa_dotacion_supervisores INTEGER NOT NULL DEFAULT 0,
  sa_dotacion_motorizados  INTEGER NOT NULL DEFAULT 0,
  numero_externo           TEXT,
  -- Campos del flyer / convocatoria pública
  ubicacion                TEXT,
  turnos_habilitados       TEXT,
  modalidad_contrato       TEXT DEFAULT 'Todas las modalidades',
  link_postulacion         TEXT,
  vigencia_link_hs         INTEGER DEFAULT 24,
  -- Flags internos
  tiene_cambios_pendientes BOOLEAN DEFAULT false,
  conflictos_revision      TEXT,
  creado_por               UUID REFERENCES profiles(id),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_servicios_adicionales_estado ON servicios_adicionales(estado);

-- -------------------------------------------------------------
-- 24. TURNOS DE SERVICIO ADICIONAL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_turnos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id           UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  nombre                TEXT,
  fecha                 DATE NOT NULL,
  hora_inicio           TIME NOT NULL,
  hora_fin              TIME NOT NULL,
  dotacion_agentes      INTEGER NOT NULL DEFAULT 0,
  dotacion_supervisores INTEGER NOT NULL DEFAULT 0,
  dotacion_choferes     INTEGER NOT NULL DEFAULT 0,
  dotacion_motorizados  INTEGER NOT NULL DEFAULT 0,
  modulos               INTEGER NOT NULL DEFAULT 0,
  orden                 INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sa_turnos_servicio ON sa_turnos(servicio_id);

-- -------------------------------------------------------------
-- 25. REQUERIMIENTOS POR ROL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_requerimientos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('jefe_general','jefe','supervisor','agente','chofer')),
  cantidad    INTEGER NOT NULL DEFAULT 1,
  UNIQUE(servicio_id, rol)
);

-- -------------------------------------------------------------
-- 26. POSTULANTES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_postulantes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id     UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  agente_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rol_solicitado  TEXT NOT NULL CHECK (rol_solicitado IN ('jefe_general','jefe','supervisor','agente','chofer')),
  origen          TEXT NOT NULL DEFAULT 'csv' CHECK (origen IN ('csv','plataforma','manual')),
  todos_los_turnos BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(servicio_id, agente_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_postulantes_servicio ON sa_postulantes(servicio_id);

CREATE TABLE IF NOT EXISTS sa_postulante_turnos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id UUID REFERENCES sa_postulantes(id) ON DELETE CASCADE NOT NULL,
  turno_id      UUID REFERENCES sa_turnos(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(postulante_id, turno_id)
);

-- -------------------------------------------------------------
-- 27. ESTRUCTURA / ORGANIGRAMA (armado)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_estructura (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id       UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  agente_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rol               TEXT NOT NULL CHECK (rol IN ('jefe_general','jefe','supervisor','agente','chofer')),
  jefe_id           UUID REFERENCES sa_estructura(id) ON DELETE SET NULL,
  turno_id          UUID REFERENCES sa_turnos(id) ON DELETE CASCADE,
  tipo_convocatoria TEXT NOT NULL DEFAULT 'adicional'
                      CHECK (tipo_convocatoria IN ('adicional','ordinario')),
  origen            TEXT NOT NULL DEFAULT 'scoring' CHECK (origen IN ('scoring','manual')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(servicio_id, agente_id, turno_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_estructura_servicio ON sa_estructura(servicio_id);
CREATE INDEX IF NOT EXISTS idx_sa_estructura_turno ON sa_estructura(turno_id);

-- -------------------------------------------------------------
-- 28. CONVOCATORIA
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_convocatoria (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estructura_id  UUID REFERENCES sa_estructura(id) ON DELETE CASCADE NOT NULL UNIQUE,
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','confirmado','rechazado','reemplazado')),
  confirmado_por UUID REFERENCES profiles(id),
  confirmado_at  TIMESTAMPTZ,
  observaciones  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sa_convocatoria_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL UNIQUE,
  token       UUID NOT NULL DEFAULT gen_random_uuid(),
  activo      BOOLEAN NOT NULL DEFAULT true,
  vence_en    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sa_conv_tokens_token ON sa_convocatoria_tokens(token);

-- -------------------------------------------------------------
-- 29. PRESENTISMO
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_presentismo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id         UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  agente_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  turno_id            UUID REFERENCES sa_turnos(id) ON DELETE CASCADE,
  presente            BOOLEAN NOT NULL,
  ausencia_justificada BOOLEAN NOT NULL DEFAULT false,
  modulos_acreditados INTEGER,
  registrado_por      UUID REFERENCES profiles(id),
  registrado_at       TIMESTAMPTZ DEFAULT NOW(),
  -- Vinculado a liquidación cuando se procesa el cobro
  liquidacion_id      UUID,  -- FK a liquidaciones se agrega abajo
  UNIQUE(servicio_id, agente_id, turno_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_presentismo_turno ON sa_presentismo(turno_id);

-- -------------------------------------------------------------
-- 30. MÓDULOS Y SCORING
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_modulos_agente (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  servicio_id UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  periodo     TEXT NOT NULL,
  modulos     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agente_id, servicio_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_modulos_agente_periodo ON sa_modulos_agente(agente_id, periodo);

CREATE TABLE IF NOT EXISTS sa_penalizaciones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  servicio_id    UUID REFERENCES servicios_adicionales(id) ON DELETE SET NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('ausencia','sancion','otro')),
  puntos         INTEGER NOT NULL DEFAULT 0,
  periodo_inicio TEXT NOT NULL,
  periodo_fin    TEXT NOT NULL,
  activa         BOOLEAN DEFAULT true,
  observaciones  TEXT,
  creado_por     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sa_penalizaciones_agente ON sa_penalizaciones(agente_id, activa);

CREATE TABLE IF NOT EXISTS sa_scoring_config (
  clave       TEXT PRIMARY KEY,
  valor       TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('number','text','select')),
  descripcion TEXT NOT NULL,
  opciones    TEXT[],
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sa_scoring_config (clave, valor, tipo, descripcion) VALUES
  ('reset_periodo',                             'mensual', 'select', 'Período de reseteo de módulos acumulados'),
  ('penalizacion_ausencia_meses',               '2',       'number', 'Meses que dura la penalización por ausencia'),
  ('penalizacion_ausencia_puntos',              '20',      'number', 'Puntos de penalización por ausencia injustificada'),
  ('penalizacion_ausencia_justificada_puntos',  '0',       'number', 'Puntos que suma una ausencia justificada al score. 0 = no afecta.'),
  ('penalizacion_sancion_puntos',               '30',      'number', 'Puntos de penalización por sanción disciplinaria'),
  ('modulo_duracion_horas',                     '4',       'number', 'Duración en horas de un módulo'),
  ('max_modulos_dia',                           '3',       'number', 'Máximo de módulos por agente por día'),
  ('scoring_formula',                           'esperados_menos_acumulados', 'select', 'Fórmula de cálculo de prioridad')
ON CONFLICT (clave) DO NOTHING;

-- -------------------------------------------------------------
-- 31. SANCIONES DISCIPLINARIAS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_sanciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  motivo        TEXT NOT NULL,
  propuesto_por UUID REFERENCES profiles(id),
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  creado_por    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sa_sanciones_agente ON sa_sanciones(agente_id);
CREATE INDEX IF NOT EXISTS idx_sa_sanciones_activa ON sa_sanciones(fecha_fin);

-- -------------------------------------------------------------
-- 32. ESTADO DE RECURSOS POR SERVICIO
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_recursos_estado (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  recurso_id  UUID REFERENCES os_adicional_recursos(id) ON DELETE CASCADE NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','solicitado','confirmado','no_disponible')),
  observacion TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id),
  UNIQUE(servicio_id, recurso_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_recursos_estado_servicio ON sa_recursos_estado(servicio_id);

-- =============================================================
-- BLOQUE 7 — COBROS Y FACTURACIÓN
-- =============================================================

-- -------------------------------------------------------------
-- 33. HISTORIAL DE VALOR UF
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS valor_uf_historico (
  id            SERIAL PRIMARY KEY,
  valor         NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  vigente_desde DATE NOT NULL,
  creado_por    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_uf_vigente_desde ON valor_uf_historico(vigente_desde);

-- -------------------------------------------------------------
-- 34. LIQUIDACIONES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liquidaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_desde   DATE NOT NULL,
  fecha_hasta   DATE NOT NULL,
  valor_uf      NUMERIC(12,2) NOT NULL,
  total_agentes INTEGER,
  total_modulos NUMERIC(10,2),
  total_monto   NUMERIC(14,2),
  generado_por  UUID REFERENCES profiles(id),
  generado_at   TIMESTAMPTZ DEFAULT NOW(),
  txt_archivo   VARCHAR(255),
  observaciones TEXT,
  CONSTRAINT liq_rango_valido CHECK (fecha_hasta >= fecha_desde)
);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_rango ON liquidaciones(fecha_desde, fecha_hasta);

CREATE TABLE IF NOT EXISTS liquidacion_detalle (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id UUID NOT NULL REFERENCES liquidaciones(id) ON DELETE CASCADE,
  profile_id     UUID REFERENCES profiles(id),
  cuil           VARCHAR(11) NOT NULL,
  cbu            VARCHAR(22) NOT NULL,
  nombre_completo TEXT NOT NULL,
  modulos        NUMERIC(10,2) NOT NULL,
  monto          NUMERIC(14,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_liq_detalle_liq ON liquidacion_detalle(liquidacion_id);

-- FK diferida: sa_presentismo.liquidacion_id → liquidaciones
ALTER TABLE sa_presentismo
  ADD CONSTRAINT fk_presentismo_liquidacion
  FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id);
CREATE INDEX IF NOT EXISTS idx_presentismo_liquidacion ON sa_presentismo(liquidacion_id);

-- -------------------------------------------------------------
-- 35. FACTURACIÓN LOYS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturacion_solicitudes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id           UUID REFERENCES servicios_adicionales(id) ON DELETE SET NULL,
  concepto              TEXT NOT NULL,
  periodo_desde         DATE NOT NULL,
  periodo_hasta         DATE NOT NULL,
  fecha_vencimiento     DATE NOT NULL,
  cuit_receptor         VARCHAR(11) NOT NULL,
  razon_social_receptor VARCHAR(100) NOT NULL,
  valor_uf              NUMERIC(12,2),
  generado_por          UUID REFERENCES profiles(id),
  generado_at           TIMESTAMPTZ DEFAULT NOW(),
  estado                VARCHAR(20) DEFAULT 'enviada',
  observaciones         TEXT,
  CONSTRAINT fac_sol_rango CHECK (periodo_hasta >= periodo_desde)
);
CREATE INDEX IF NOT EXISTS idx_fac_sol_servicio ON facturacion_solicitudes(servicio_id);

CREATE TABLE IF NOT EXISTS facturacion_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id       UUID NOT NULL REFERENCES facturacion_solicitudes(id) ON DELETE CASCADE,
  profile_id         UUID REFERENCES profiles(id),
  token              UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  tipo               VARCHAR(10) DEFAULT 'loys',
  nombre_completo    TEXT,
  cuil               VARCHAR(11),
  email              TEXT,
  datos_enviados     JSONB,
  estado             VARCHAR(30) DEFAULT 'pendiente',
  factura_numero     VARCHAR(100),
  factura_fecha      DATE,
  factura_archivo    VARCHAR(255),
  factura_datos      JSONB,
  observaciones_rrhh TEXT,
  mail_enviado_at    TIMESTAMPTZ,
  presentada_at      TIMESTAMPTZ,
  revisada_at        TIMESTAMPTZ,
  revisada_por       UUID REFERENCES profiles(id),
  CONSTRAINT fac_item_estado CHECK (
    estado IN ('pendiente','presentada','aprobada','rechazada','subsanacion')
  )
);
CREATE INDEX IF NOT EXISTS idx_fac_item_solicitud ON facturacion_items(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_fac_item_token     ON facturacion_items(token);
CREATE INDEX IF NOT EXISTS idx_fac_item_profile   ON facturacion_items(profile_id);

-- =============================================================
-- BLOQUE 8 — CONFIGURACIÓN DEL SISTEMA
-- =============================================================

-- -------------------------------------------------------------
-- 36. SISTEMA_CONFIG (clave-valor, principalmente SMTP)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sistema_config (
  clave           VARCHAR(80) PRIMARY KEY,
  valor           TEXT,
  descripcion     TEXT,
  actualizado_por UUID REFERENCES profiles(id),
  actualizado_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sistema_config (clave, valor, descripcion) VALUES
  ('smtp_host', 'smtp.office365.com', 'Servidor SMTP'),
  ('smtp_port', '587',                'Puerto SMTP'),
  ('smtp_user', '',                   'Usuario / casilla institucional'),
  ('smtp_pass', '',                   'Contraseña de casilla (rota cada 15 días)'),
  ('smtp_from', '',                   'Nombre visible del remitente')
ON CONFLICT (clave) DO NOTHING;

-- =============================================================
-- FIN DEL SCHEMA
-- Actualizado: 2026-05-12
-- =============================================================
