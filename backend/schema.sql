-- =============================================================
-- CAT PLATAFORMA — Schema completo
-- Generado: 2026-04-23
-- Ejecutar en una base de datos PostgreSQL vacía llamada cat_plataforma
-- =============================================================

-- -------------------------------------------------------------
-- EXTENSIONES
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN (
    'gerencia','jefe_base','coordinador','supervisor','agente','admin',
    'director','planeamiento','jefe_cgm','coordinador_cgm',
    'operador_adicionales'
  )),
  base_id         UUID REFERENCES bases(id),
  turno           TEXT,
  legajo          TEXT UNIQUE,
  nombre_completo TEXT NOT NULL,
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. ORDENES DE SERVICIO (ordinarias)
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
-- 4. ITEMS DE ORDEN DE SERVICIO
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id           UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('servicio','mision')),
  codigo          TEXT NOT NULL,
  descripcion     TEXT NOT NULL,
  turno           TEXT NOT NULL,
  modo_ubicacion  TEXT DEFAULT 'altura'
                    CHECK (modo_ubicacion IN ('altura','interseccion','entre_calles','poligono')),
  calle           TEXT,
  altura          TEXT,
  calle2          TEXT,
  desde           TEXT,
  hasta           TEXT,
  poligono_desc   TEXT,
  poligono_coords JSONB,
  eje_psv         TEXT,
  es_mision       BOOLEAN DEFAULT false,
  cantidad_agentes JSONB DEFAULT '{}',
  relevo_tipo     TEXT CHECK (relevo_tipo IN ('Normal','En zona')),
  relevo_base_id  UUID REFERENCES bases(id),
  relevo_turno    TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  place_id        TEXT,
  instrucciones   TEXT,
  comuna          TEXT,
  barrio          TEXT,
  orden           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 5. CADENA DE TURNOS DE ITEMS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_item_turnos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id  UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  orden       INTEGER NOT NULL DEFAULT 0,
  turno       TEXT NOT NULL,
  base_id     UUID REFERENCES bases(id),
  cantidad_agentes INTEGER NOT NULL DEFAULT 1,
  coordinador_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_os_item_turnos_item ON os_item_turnos(os_item_id);

CREATE TABLE IF NOT EXISTS os_item_relevos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id  UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  orden       INTEGER NOT NULL DEFAULT 0,
  tipo        TEXT NOT NULL DEFAULT 'Normal' CHECK (tipo IN ('Normal','En zona')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_os_item_relevos_item ON os_item_relevos(os_item_id);

-- -------------------------------------------------------------
-- 6. FECHAS ESPECÍFICAS POR ITEM
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_item_fechas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id  UUID REFERENCES os_items(id) ON DELETE CASCADE NOT NULL,
  fecha       DATE NOT NULL,
  UNIQUE(os_item_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_os_item_fechas_item  ON os_item_fechas(os_item_id);
CREATE INDEX IF NOT EXISTS idx_os_item_fechas_fecha ON os_item_fechas(fecha);

-- -------------------------------------------------------------
-- 7. FECHAS DE OS (para OS adicionales / con fechas salteadas)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_fechas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id       UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
  fecha       DATE NOT NULL,
  hora_inicio TIME,
  hora_fin    TIME,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 8. MISIONES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS misiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_item_id      UUID REFERENCES os_items(id) ON DELETE SET NULL,
  base_id         UUID REFERENCES bases(id) NOT NULL,
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  turno           TEXT NOT NULL,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  estado          TEXT NOT NULL DEFAULT 'sin_asignar'
                    CHECK (estado IN ('sin_asignar','asignada','en_mision','interrumpida','cerrada')),
  modo_ubicacion  TEXT DEFAULT 'altura',
  calle           TEXT,
  altura          TEXT,
  calle2          TEXT,
  desde           TEXT,
  hasta           TEXT,
  poligono_desc   TEXT,
  eje_psv         TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  encargado_id    UUID REFERENCES profiles(id),
  fotos           TEXT[] DEFAULT '{}',
  observaciones   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
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
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mision_id  UUID REFERENCES misiones(id) ON DELETE CASCADE NOT NULL,
  agente_id  UUID REFERENCES profiles(id) NOT NULL,
  motivo     TEXT NOT NULL,
  inicio     TIMESTAMPTZ DEFAULT NOW(),
  fin        TIMESTAMPTZ,
  activa     BOOLEAN DEFAULT true
);

-- -------------------------------------------------------------
-- 9. ACTIVIDAD / LOG
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
-- 10. TOKENS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti        UUID PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- -------------------------------------------------------------
-- 11. GRUPOS Y ACCESOS ALCOHOLEMIA
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
-- OS ADICIONAL
-- =============================================================

-- -------------------------------------------------------------
-- 12. OS ADICIONAL (cabecera)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                TEXT NOT NULL,
  evento_motivo         TEXT,
  estado                TEXT NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador','validacion','validada','rechazada','cumplida')),
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
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 13. FECHAS DE OS ADICIONAL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_fechas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
  fecha           DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 14. RECURSOS DE OS ADICIONAL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS os_adicional_recursos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id UUID REFERENCES os_adicional(id) ON DELETE CASCADE NOT NULL,
  tipo            TEXT NOT NULL,
  cantidad        INTEGER NOT NULL DEFAULT 0,
  descripcion     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 15. ZONAS, ELEMENTOS, FASES
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
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id   UUID REFERENCES os_adicional_zonas(id) ON DELETE CASCADE,
  fase_id   UUID,   -- se agrega FK luego de crear os_adicional_fases
  tipo      TEXT NOT NULL CHECK (tipo IN ('punto_control','tramo','zona_area','desvio')),
  nombre    TEXT,
  instruccion TEXT,
  geometria JSONB NOT NULL,
  color     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_elementos_fase_id ON os_adicional_elementos(fase_id);

-- -------------------------------------------------------------
-- 16. TURNOS DE OS ADICIONAL
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
-- 17. FASES DE OS ADICIONAL
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

-- FK de elementos → fases (ahora que fases existe)
ALTER TABLE os_adicional_elementos
  ADD CONSTRAINT fk_elementos_fase
  FOREIGN KEY (fase_id) REFERENCES os_adicional_fases(id) ON DELETE CASCADE;

-- -------------------------------------------------------------
-- 18. FASE-ZONAS (relación N:M con datos operativos)
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
-- SERVICIOS ADICIONALES (módulo de convocatoria y presentismo)
-- =============================================================

-- -------------------------------------------------------------
-- 19. SERVICIOS ADICIONALES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios_adicionales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_adicional_id     UUID REFERENCES os_adicional(id) ON DELETE SET NULL,
  estado              TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','en_gestion','convocado','en_curso','cerrado')),
  fecha_servicio      DATE,
  hora_inicio         TIME,
  hora_fin            TIME,
  modulos_calculados  INTEGER,
  observaciones       TEXT,
  ubicacion           TEXT,
  turnos_habilitados  TEXT,
  modalidad_contrato  TEXT DEFAULT 'Todas las modalidades',
  link_postulacion    TEXT,
  vigencia_link_hs    INTEGER DEFAULT 24,
  creado_por          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_servicios_adicionales_estado ON servicios_adicionales(estado);

-- -------------------------------------------------------------
-- 20. TURNOS DE SERVICIO ADICIONAL
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
-- 21. REQUERIMIENTOS POR ROL
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_requerimientos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('jefe_general','jefe','supervisor','agente','chofer')),
  cantidad    INTEGER NOT NULL DEFAULT 1,
  UNIQUE(servicio_id, rol)
);

-- -------------------------------------------------------------
-- 22. POSTULANTES
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
-- 23. ESTRUCTURA / ORGANIGRAMA
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
-- 24. CONVOCATORIA
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_convocatoria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estructura_id   UUID REFERENCES sa_estructura(id) ON DELETE CASCADE NOT NULL UNIQUE,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','confirmado','rechazado','reemplazado')),
  confirmado_por  UUID REFERENCES profiles(id),
  confirmado_at   TIMESTAMPTZ,
  observaciones   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
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
-- 25. PRESENTISMO
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sa_presentismo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id         UUID REFERENCES servicios_adicionales(id) ON DELETE CASCADE NOT NULL,
  agente_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  turno_id            UUID REFERENCES sa_turnos(id) ON DELETE CASCADE,
  presente            BOOLEAN NOT NULL,
  modulos_acreditados INTEGER,
  registrado_por      UUID REFERENCES profiles(id),
  registrado_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(servicio_id, agente_id, turno_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_presentismo_turno ON sa_presentismo(turno_id);

-- -------------------------------------------------------------
-- 26. MÓDULOS Y SCORING
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
  ('reset_periodo',                'mensual', 'select', 'Período de reseteo de módulos acumulados'),
  ('penalizacion_ausencia_meses',  '2',       'number', 'Meses que dura la penalización por ausencia'),
  ('penalizacion_ausencia_puntos', '20',      'number', 'Puntos de penalización por ausencia injustificada'),
  ('penalizacion_sancion_puntos',  '30',      'number', 'Puntos de penalización por sanción disciplinaria'),
  ('modulo_duracion_horas',        '4',       'number', 'Duración en horas de un módulo'),
  ('max_modulos_dia',              '3',       'number', 'Máximo de módulos por agente por día'),
  ('scoring_formula',              'esperados_menos_acumulados', 'select', 'Fórmula de cálculo de prioridad')
ON CONFLICT (clave) DO NOTHING;

-- -------------------------------------------------------------
-- 27. SANCIONES DISCIPLINARIAS
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
