--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: fn_generar_numero_presupuesto(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_generar_numero_presupuesto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  anio INT := EXTRACT(YEAR FROM NOW());
  seq  INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(REPLACE(numero, '/' || anio, ''), 'P-', 2) AS INT)
  ), 0) + 1
  INTO seq
  FROM presupuestos
  WHERE numero LIKE 'P-%/' || anio;

  NEW.numero := 'P-' || LPAD(seq::TEXT, 3, '0') || '/' || anio;
  RETURN NEW;
END;
$$;



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actividad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.actividad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_id uuid,
    mision_id uuid,
    agente_id uuid,
    tipo text NOT NULL,
    descripcion text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: bases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    direccion text,
    activa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: beneficiario_documentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.beneficiario_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    beneficiario_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    tipo_mime character varying(100),
    tamanio integer,
    subido_por uuid,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: beneficiarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.beneficiarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    razon_social character varying(255) NOT NULL,
    nombre character varying(255),
    email character varying(255),
    telefono character varying(50),
    cuit character varying(20),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);



--
-- Name: facturacion_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facturacion_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    solicitud_id uuid NOT NULL,
    profile_id uuid,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo character varying(10) DEFAULT 'loys'::character varying,
    nombre_completo text,
    cuil character varying(11),
    email text,
    datos_enviados jsonb,
    estado character varying(30) DEFAULT 'pendiente'::character varying,
    factura_numero character varying(100),
    factura_fecha date,
    factura_archivo character varying(255),
    factura_datos jsonb,
    observaciones_rrhh text,
    mail_enviado_at timestamp with time zone,
    presentada_at timestamp with time zone,
    revisada_at timestamp with time zone,
    revisada_por uuid,
    CONSTRAINT fac_item_estado CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('presentada'::character varying)::text, ('aprobada'::character varying)::text, ('rechazada'::character varying)::text, ('subsanacion'::character varying)::text])))
);



--
-- Name: facturacion_solicitudes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facturacion_solicitudes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid,
    concepto text NOT NULL,
    periodo_desde date NOT NULL,
    periodo_hasta date NOT NULL,
    fecha_vencimiento date NOT NULL,
    cuit_receptor character varying(11) NOT NULL,
    razon_social_receptor character varying(100) NOT NULL,
    valor_uf numeric(12,2),
    generado_por uuid,
    generado_at timestamp with time zone DEFAULT now(),
    estado character varying(20) DEFAULT 'enviada'::character varying,
    observaciones text,
    CONSTRAINT fac_sol_rango CHECK ((periodo_hasta >= periodo_desde))
);



--
-- Name: grupo_reglas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupo_reglas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grupo_id uuid NOT NULL,
    tipo text NOT NULL,
    valor text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT grupo_reglas_tipo_check CHECK ((tipo = ANY (ARRAY['base'::text, 'role'::text, 'profile'::text])))
);



--
-- Name: grupos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grupos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    modulo text DEFAULT '*'::text,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: interrupciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interrupciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mision_id uuid NOT NULL,
    agente_id uuid NOT NULL,
    motivo text NOT NULL,
    inicio timestamp with time zone DEFAULT now(),
    fin timestamp with time zone,
    activa boolean DEFAULT true
);



--
-- Name: liquidacion_detalle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.liquidacion_detalle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    liquidacion_id uuid NOT NULL,
    profile_id uuid,
    cuil character varying(11) NOT NULL,
    cbu character varying(22) NOT NULL,
    nombre_completo text NOT NULL,
    modulos numeric(10,2) NOT NULL,
    monto numeric(14,2) NOT NULL
);



--
-- Name: liquidaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.liquidaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha_desde date NOT NULL,
    fecha_hasta date NOT NULL,
    valor_uf numeric(12,2) NOT NULL,
    total_agentes integer,
    total_modulos numeric(10,2),
    total_monto numeric(14,2),
    generado_por uuid,
    generado_at timestamp with time zone DEFAULT now(),
    txt_archivo character varying(255),
    observaciones text,
    CONSTRAINT liq_rango_valido CHECK ((fecha_hasta >= fecha_desde))
);



--
-- Name: mision_agentes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mision_agentes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mision_id uuid NOT NULL,
    agente_id uuid NOT NULL,
    estado text DEFAULT 'asignado'::text NOT NULL,
    es_encargado boolean DEFAULT false,
    asignado_at timestamp with time zone DEFAULT now(),
    aceptado_at timestamp with time zone,
    CONSTRAINT mision_agentes_estado_check CHECK ((estado = ANY (ARRAY['asignado'::text, 'en_mision'::text, 'libre'::text])))
);



--
-- Name: misiones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.misiones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_item_id uuid,
    base_id uuid NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    turno text NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    estado text DEFAULT 'sin_asignar'::text NOT NULL,
    modo_ubicacion text DEFAULT 'altura'::text,
    calle text,
    altura text,
    calle2 text,
    desde text,
    hasta text,
    poligono_desc text,
    eje_psv text,
    lat double precision,
    lng double precision,
    encargado_id uuid,
    fotos text[] DEFAULT '{}'::text[],
    observaciones text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tipo text DEFAULT 'servicio'::text,
    CONSTRAINT misiones_estado_check CHECK ((estado = ANY (ARRAY['sin_asignar'::text, 'asignada'::text, 'en_mision'::text, 'interrumpida'::text, 'cerrada'::text]))),
    CONSTRAINT misiones_tipo_check CHECK ((tipo = ANY (ARRAY['servicio'::text, 'mision'::text])))
);



--
-- Name: ordenes_servicio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ordenes_servicio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_id uuid NOT NULL,
    titulo text NOT NULL,
    semana_inicio date,
    semana_fin date,
    estado text DEFAULT 'borrador'::text NOT NULL,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    numero integer NOT NULL,
    tipo text DEFAULT 'ordinaria'::text NOT NULL,
    vigencia_inicio timestamp with time zone,
    vigencia_fin timestamp with time zone,
    CONSTRAINT ordenes_servicio_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'validacion'::text, 'vigente'::text, 'cumplida'::text]))),
    CONSTRAINT ordenes_servicio_tipo_check CHECK ((tipo = ANY (ARRAY['ordinaria'::text, 'adicional'::text, 'alcoholemia'::text])))
);



--
-- Name: ordenes_servicio_numero_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ordenes_servicio_numero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: ordenes_servicio_numero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ordenes_servicio_numero_seq OWNED BY public.ordenes_servicio.numero;


--
-- Name: os_adicional; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    evento_motivo text,
    estado text DEFAULT 'borrador'::text NOT NULL,
    base_id uuid,
    creado_por uuid,
    horario_desde time without time zone,
    horario_hasta time without time zone,
    dotacion_agentes integer DEFAULT 0,
    dotacion_supervisores integer DEFAULT 0,
    dotacion_motorizados integer DEFAULT 0,
    observaciones text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    validado_por uuid,
    validado_at timestamp with time zone,
    obs_rechazo text,
    servicio_id uuid,
    CONSTRAINT os_adicional_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'validacion'::text, 'validada'::text, 'rechazada'::text, 'cumplida'::text, 'cancelada'::text, 'requiere_revision'::text])))
);



--
-- Name: os_adicional_elementos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional_elementos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zona_id uuid,
    tipo text NOT NULL,
    nombre text,
    instruccion text,
    geometria jsonb NOT NULL,
    color text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    fase_id uuid,
    CONSTRAINT os_adicional_elementos_tipo_check CHECK ((tipo = ANY (ARRAY['punto_control'::text, 'tramo'::text, 'zona_area'::text, 'desvio'::text])))
);



--
-- Name: os_adicional_fase_zonas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional_fase_zonas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fase_id uuid NOT NULL,
    zona_id uuid NOT NULL,
    tipo_operacion text,
    dotacion_agentes integer DEFAULT 0,
    dotacion_supervisores integer DEFAULT 0,
    dotacion_motorizados integer DEFAULT 0,
    instrucciones text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT os_adicional_fase_zonas_tipo_operacion_check CHECK ((tipo_operacion = ANY (ARRAY['ingreso'::text, 'egreso'::text, 'control'::text, 'corte'::text, 'desvio'::text, 'contracarril'::text, 'estacionamiento'::text, 'refuerzo'::text, 'otro'::text])))
);



--
-- Name: os_adicional_fases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional_fases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_adicional_id uuid NOT NULL,
    nombre text NOT NULL,
    horario_desde time without time zone,
    horario_hasta time without time zone,
    color text DEFAULT '#e24b4a'::text NOT NULL,
    orden integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    fecha date,
    turno_id uuid
);



--
-- Name: os_adicional_fechas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional_fechas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_adicional_id uuid NOT NULL,
    fecha date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: os_adicional_recursos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional_recursos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_adicional_id uuid NOT NULL,
    tipo text NOT NULL,
    cantidad integer DEFAULT 0 NOT NULL,
    descripcion text,
    created_at timestamp with time zone DEFAULT now(),
    categoria text DEFAULT 'elemento'::text NOT NULL,
    CONSTRAINT os_adicional_recursos_categoria_check CHECK ((categoria = ANY (ARRAY['vehiculo'::text, 'elemento'::text])))
);



--
-- Name: os_adicional_turnos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional_turnos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_adicional_id uuid NOT NULL,
    nombre text,
    fecha date,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    dotacion_agentes integer DEFAULT 0 NOT NULL,
    dotacion_supervisores integer DEFAULT 0 NOT NULL,
    dotacion_choferes integer DEFAULT 0 NOT NULL,
    orden integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dotacion_motorizados integer DEFAULT 0 NOT NULL,
    dotacion_choferes_gruas integer DEFAULT 0 NOT NULL,
    dotacion_coordinadores integer DEFAULT 0 NOT NULL,
    dotacion_jefes_operativo integer DEFAULT 0 NOT NULL
);



--
-- Name: os_adicional_zonas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_adicional_zonas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_adicional_id uuid NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    orden integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);



--
-- Name: os_alcoholemia_accesos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_alcoholemia_accesos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_id uuid NOT NULL,
    tipo text NOT NULL,
    valor text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT os_alcoholemia_accesos_tipo_check CHECK ((tipo = ANY (ARRAY['base'::text, 'role'::text, 'profile'::text, 'grupo'::text, 'area'::text])))
);



--
-- Name: os_fechas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_fechas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_id uuid NOT NULL,
    fecha date NOT NULL,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: os_item_fechas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_item_fechas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_item_id uuid NOT NULL,
    fecha date NOT NULL
);



--
-- Name: os_item_relevos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_item_relevos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_item_id uuid NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    tipo text DEFAULT 'Normal'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT os_item_relevos_tipo_check CHECK ((tipo = ANY (ARRAY['Normal'::text, 'En zona'::text])))
);



--
-- Name: os_item_turnos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_item_turnos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_item_id uuid NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    turno text NOT NULL,
    base_id uuid,
    cantidad_agentes integer DEFAULT 1 NOT NULL,
    coordinador_id uuid,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: os_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_id uuid NOT NULL,
    tipo text NOT NULL,
    codigo text NOT NULL,
    descripcion text NOT NULL,
    turno text NOT NULL,
    modo_ubicacion text DEFAULT 'altura'::text,
    calle text,
    altura text,
    calle2 text,
    desde text,
    hasta text,
    poligono_desc text,
    eje_psv text,
    cantidad_agentes jsonb DEFAULT '{}'::jsonb,
    relevo_tipo text,
    relevo_base_id uuid,
    relevo_turno text,
    lat double precision,
    lng double precision,
    place_id text,
    orden integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    instrucciones text,
    poligono_coords jsonb,
    comuna text,
    barrio text,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    sentido text,
    CONSTRAINT os_items_modo_ubicacion_check CHECK ((modo_ubicacion = ANY (ARRAY['altura'::text, 'interseccion'::text, 'entre_calles'::text, 'poligono'::text]))),
    CONSTRAINT os_items_relevo_tipo_check CHECK ((relevo_tipo = ANY (ARRAY['Normal'::text, 'En zona'::text]))),
    CONSTRAINT os_items_sentido_check CHECK (((sentido IS NULL) OR (sentido = ANY (ARRAY['norte'::text, 'sur'::text, 'este'::text, 'oeste'::text, 'ambos'::text])))),
    CONSTRAINT os_items_tipo_check CHECK ((tipo = ANY (ARRAY['servicio'::text, 'mision'::text, 'puesto'::text, 'itinerante'::text])))
);



--
-- Name: os_numero_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.os_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: presupuestos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.presupuestos (
    id integer NOT NULL,
    numero character varying(20) NOT NULL,
    beneficiario character varying(255) NOT NULL,
    evento character varying(255) NOT NULL,
    estado character varying(20) DEFAULT 'borrador'::character varying NOT NULL,
    valor_modulo numeric(12,2) DEFAULT 71249.25 NOT NULL,
    validez_dias integer DEFAULT 3 NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    observaciones text,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    beneficiario_id uuid,
    bui_numero character varying(100),
    bui_archivo character varying(255),
    bui_comp_numero character varying(100),
    bui_comp_archivo character varying(500)
);



--
-- Name: presupuestos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.presupuestos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: presupuestos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.presupuestos_id_seq OWNED BY public.presupuestos.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    base_id uuid,
    turno text,
    legajo text,
    nombre_completo text NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    estado_turno text DEFAULT 'fuera_turno'::text,
    telefono text,
    cuit text,
    cargo text,
    funcion text,
    funcion_especifica text,
    tipo_contrato text,
    fecha_nacimiento date,
    hora_entrada time without time zone,
    hora_salida time without time zone,
    telefono_ht text,
    loys boolean DEFAULT false NOT NULL,
    cbu character varying(22),
    area text,
    CONSTRAINT profiles_estado_turno_check CHECK ((estado_turno = ANY (ARRAY['libre'::text, 'en_mision'::text, 'fuera_turno'::text])))
);



--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revoked_tokens (
    jti uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone DEFAULT now()
);



--
-- Name: rol_permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol_permisos (
    rol character varying(50) NOT NULL,
    permiso_key character varying(60) NOT NULL
);



--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    key character varying(60) NOT NULL,
    label text NOT NULL,
    descripcion text DEFAULT ''::text,
    color text DEFAULT '#636366'::text,
    bg text DEFAULT '#f5f5f7'::text,
    es_sistema boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: sa_convocatoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_convocatoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estructura_id uuid NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    confirmado_por uuid,
    confirmado_at timestamp with time zone,
    observaciones text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sa_convocatoria_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'confirmado'::text, 'rechazado'::text, 'reemplazado'::text])))
);



--
-- Name: sa_convocatoria_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_convocatoria_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    vence_en timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: sa_estructura; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_estructura (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    agente_id uuid NOT NULL,
    rol text NOT NULL,
    jefe_id uuid,
    origen text DEFAULT 'scoring'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    turno_id uuid,
    tipo_convocatoria text DEFAULT 'adicional'::text NOT NULL,
    CONSTRAINT sa_estructura_origen_check CHECK ((origen = ANY (ARRAY['scoring'::text, 'manual'::text, 'manual_forzado'::text]))),
    CONSTRAINT sa_estructura_rol_check CHECK ((rol = ANY (ARRAY['infante'::text, 'supervisor'::text, 'chofer'::text, 'motorizado'::text, 'chofer_grua'::text, 'coordinador'::text]))),
    CONSTRAINT sa_estructura_tipo_convocatoria_check CHECK ((tipo_convocatoria = ANY (ARRAY['adicional'::text, 'ordinario'::text])))
);



--
-- Name: sa_modulos_agente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_modulos_agente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agente_id uuid NOT NULL,
    servicio_id uuid NOT NULL,
    periodo text NOT NULL,
    modulos integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: sa_penalizaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_penalizaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agente_id uuid NOT NULL,
    servicio_id uuid,
    tipo text NOT NULL,
    puntos integer DEFAULT 0 NOT NULL,
    periodo_inicio text NOT NULL,
    periodo_fin text NOT NULL,
    activa boolean DEFAULT true,
    observaciones text,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sa_penalizaciones_tipo_check CHECK ((tipo = ANY (ARRAY['ausencia'::text, 'sancion'::text, 'otro'::text])))
);



--
-- Name: sa_postulante_turnos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_postulante_turnos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    postulante_id uuid NOT NULL,
    turno_id uuid NOT NULL
);



--
-- Name: sa_postulantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_postulantes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    agente_id uuid NOT NULL,
    rol_solicitado text NOT NULL,
    origen text DEFAULT 'csv'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    todos_los_turnos boolean DEFAULT true,
    telefono text,
    CONSTRAINT sa_postulantes_origen_check CHECK ((origen = ANY (ARRAY['csv'::text, 'plataforma'::text, 'manual'::text, 'formulario'::text]))),
    CONSTRAINT sa_postulantes_rol_solicitado_check CHECK ((rol_solicitado = ANY (ARRAY['infante'::text, 'supervisor'::text, 'chofer'::text, 'motorizado'::text, 'chofer_grua'::text, 'coordinador'::text])))
);



--
-- Name: sa_presentismo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_presentismo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    agente_id uuid NOT NULL,
    presente boolean NOT NULL,
    modulos_acreditados integer,
    registrado_por uuid,
    registrado_at timestamp with time zone DEFAULT now(),
    turno_id uuid,
    ausencia_justificada boolean DEFAULT false NOT NULL,
    liquidacion_id uuid
);



--
-- Name: sa_recursos_estado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_recursos_estado (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    recurso_id uuid NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    observacion text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT sa_recursos_estado_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'solicitado'::text, 'confirmado'::text, 'no_disponible'::text])))
);



--
-- Name: sa_requerimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_requerimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    rol text NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL
);



--
-- Name: sa_sanciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_sanciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agente_id uuid NOT NULL,
    motivo text NOT NULL,
    propuesto_por uuid,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);



--
-- Name: sa_scoring_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_scoring_config (
    clave text NOT NULL,
    valor text NOT NULL,
    tipo text NOT NULL,
    descripcion text NOT NULL,
    opciones text[],
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sa_scoring_config_tipo_check CHECK ((tipo = ANY (ARRAY['number'::text, 'text'::text, 'select'::text])))
);



--
-- Name: sa_turnos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sa_turnos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    modulos integer,
    dotacion_agentes integer DEFAULT 0,
    dotacion_supervisores integer DEFAULT 0,
    dotacion_choferes integer DEFAULT 0,
    orden integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dotacion_motorizados integer DEFAULT 0 NOT NULL,
    nombre text,
    dotacion_choferes_grua integer DEFAULT 0 NOT NULL,
    dotacion_coordinadores integer DEFAULT 0 NOT NULL,
    os_turno_id uuid
);



--
-- Name: servicio_documentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicio_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    tipo character varying(50) NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    tipo_mime character varying(100),
    tamanio integer,
    subido_por uuid,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: servicios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_servicio character varying(10) NOT NULL,
    presupuesto_id integer,
    bui_pagada boolean DEFAULT false,
    observaciones text,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    cancelado_at timestamp with time zone,
    cancelado_por uuid
);



--
-- Name: servicios_adicionales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicios_adicionales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    os_adicional_id uuid,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    fecha_servicio date,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    modulos_calculados integer,
    observaciones text,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ubicacion text,
    turnos_habilitados text,
    modalidad_contrato text DEFAULT 'Todas las modalidades'::text,
    link_postulacion text,
    vigencia_link_hs integer DEFAULT 24,
    sa_nombre text,
    sa_evento text,
    sa_base_id uuid,
    sa_horario_desde time without time zone,
    sa_horario_hasta time without time zone,
    sa_dotacion_agentes integer DEFAULT 0 NOT NULL,
    sa_dotacion_supervisores integer DEFAULT 0 NOT NULL,
    sa_dotacion_motorizados integer DEFAULT 0 NOT NULL,
    numero_externo text,
    sa_dotacion_choferes integer DEFAULT 0 NOT NULL,
    sa_dotacion_choferes_grua integer DEFAULT 0 NOT NULL,
    sa_dotacion_coordinadores integer DEFAULT 0 NOT NULL,
    sa_fechas date[] DEFAULT '{}'::date[],
    tiene_cambios_pendientes boolean DEFAULT false,
    servicio_id uuid,
    conflictos_revision jsonb,
    CONSTRAINT servicios_adicionales_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'en_gestion'::text, 'convocado'::text, 'en_curso'::text, 'cerrado'::text, 'cancelado'::text])))
);



--
-- Name: sistema_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sistema_config (
    clave character varying(80) NOT NULL,
    valor text,
    descripcion text,
    actualizado_por uuid,
    actualizado_at timestamp with time zone DEFAULT now()
);



--
-- Name: valor_uf_historico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.valor_uf_historico (
    id integer NOT NULL,
    valor numeric(12,2) NOT NULL,
    vigente_desde date NOT NULL,
    creado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valor_uf_historico_valor_check CHECK ((valor > (0)::numeric))
);



--
-- Name: valor_uf_historico_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.valor_uf_historico_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: valor_uf_historico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.valor_uf_historico_id_seq OWNED BY public.valor_uf_historico.id;


--
-- Name: ordenes_servicio numero; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_servicio ALTER COLUMN numero SET DEFAULT nextval('public.ordenes_servicio_numero_seq'::regclass);


--
-- Name: presupuestos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presupuestos ALTER COLUMN id SET DEFAULT nextval('public.presupuestos_id_seq'::regclass);


--
-- Name: valor_uf_historico id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.valor_uf_historico ALTER COLUMN id SET DEFAULT nextval('public.valor_uf_historico_id_seq'::regclass);


--
-- Name: actividad actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_pkey PRIMARY KEY (id);


--
-- Name: bases bases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bases
    ADD CONSTRAINT bases_pkey PRIMARY KEY (id);


--
-- Name: beneficiario_documentos beneficiario_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiario_documentos
    ADD CONSTRAINT beneficiario_documentos_pkey PRIMARY KEY (id);


--
-- Name: beneficiarios beneficiarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiarios
    ADD CONSTRAINT beneficiarios_pkey PRIMARY KEY (id);


--
-- Name: facturacion_items facturacion_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_items
    ADD CONSTRAINT facturacion_items_pkey PRIMARY KEY (id);


--
-- Name: facturacion_items facturacion_items_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_items
    ADD CONSTRAINT facturacion_items_token_key UNIQUE (token);


--
-- Name: facturacion_solicitudes facturacion_solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_solicitudes
    ADD CONSTRAINT facturacion_solicitudes_pkey PRIMARY KEY (id);


--
-- Name: grupo_reglas grupo_reglas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo_reglas
    ADD CONSTRAINT grupo_reglas_pkey PRIMARY KEY (id);


--
-- Name: grupos grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);


--
-- Name: interrupciones interrupciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interrupciones
    ADD CONSTRAINT interrupciones_pkey PRIMARY KEY (id);


--
-- Name: liquidacion_detalle liquidacion_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_pkey PRIMARY KEY (id);


--
-- Name: liquidaciones liquidaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_pkey PRIMARY KEY (id);


--
-- Name: mision_agentes mision_agentes_mision_id_agente_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mision_agentes
    ADD CONSTRAINT mision_agentes_mision_id_agente_id_key UNIQUE (mision_id, agente_id);


--
-- Name: mision_agentes mision_agentes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mision_agentes
    ADD CONSTRAINT mision_agentes_pkey PRIMARY KEY (id);


--
-- Name: misiones misiones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.misiones
    ADD CONSTRAINT misiones_pkey PRIMARY KEY (id);


--
-- Name: ordenes_servicio ordenes_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_servicio
    ADD CONSTRAINT ordenes_servicio_pkey PRIMARY KEY (id);


--
-- Name: os_adicional_elementos os_adicional_elementos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_elementos
    ADD CONSTRAINT os_adicional_elementos_pkey PRIMARY KEY (id);


--
-- Name: os_adicional_fase_zonas os_adicional_fase_zonas_fase_id_zona_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fase_zonas
    ADD CONSTRAINT os_adicional_fase_zonas_fase_id_zona_id_key UNIQUE (fase_id, zona_id);


--
-- Name: os_adicional_fase_zonas os_adicional_fase_zonas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fase_zonas
    ADD CONSTRAINT os_adicional_fase_zonas_pkey PRIMARY KEY (id);


--
-- Name: os_adicional_fases os_adicional_fases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fases
    ADD CONSTRAINT os_adicional_fases_pkey PRIMARY KEY (id);


--
-- Name: os_adicional_fechas os_adicional_fechas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fechas
    ADD CONSTRAINT os_adicional_fechas_pkey PRIMARY KEY (id);


--
-- Name: os_adicional os_adicional_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional
    ADD CONSTRAINT os_adicional_pkey PRIMARY KEY (id);


--
-- Name: os_adicional_recursos os_adicional_recursos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_recursos
    ADD CONSTRAINT os_adicional_recursos_pkey PRIMARY KEY (id);


--
-- Name: os_adicional_turnos os_adicional_turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_turnos
    ADD CONSTRAINT os_adicional_turnos_pkey PRIMARY KEY (id);


--
-- Name: os_adicional_zonas os_adicional_zonas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_zonas
    ADD CONSTRAINT os_adicional_zonas_pkey PRIMARY KEY (id);


--
-- Name: os_alcoholemia_accesos os_alcoholemia_accesos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_alcoholemia_accesos
    ADD CONSTRAINT os_alcoholemia_accesos_pkey PRIMARY KEY (id);


--
-- Name: os_fechas os_fechas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_fechas
    ADD CONSTRAINT os_fechas_pkey PRIMARY KEY (id);


--
-- Name: os_item_fechas os_item_fechas_os_item_id_fecha_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_fechas
    ADD CONSTRAINT os_item_fechas_os_item_id_fecha_key UNIQUE (os_item_id, fecha);


--
-- Name: os_item_fechas os_item_fechas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_fechas
    ADD CONSTRAINT os_item_fechas_pkey PRIMARY KEY (id);


--
-- Name: os_item_relevos os_item_relevos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_relevos
    ADD CONSTRAINT os_item_relevos_pkey PRIMARY KEY (id);


--
-- Name: os_item_turnos os_item_turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_turnos
    ADD CONSTRAINT os_item_turnos_pkey PRIMARY KEY (id);


--
-- Name: os_items os_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_items
    ADD CONSTRAINT os_items_pkey PRIMARY KEY (id);


--
-- Name: presupuestos presupuestos_numero_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presupuestos
    ADD CONSTRAINT presupuestos_numero_key UNIQUE (numero);


--
-- Name: presupuestos presupuestos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presupuestos
    ADD CONSTRAINT presupuestos_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_legajo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_legajo_key UNIQUE (legajo);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (jti);


--
-- Name: rol_permisos rol_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_pkey PRIMARY KEY (rol, permiso_key);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (key);


--
-- Name: sa_convocatoria sa_convocatoria_estructura_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_convocatoria
    ADD CONSTRAINT sa_convocatoria_estructura_id_key UNIQUE (estructura_id);


--
-- Name: sa_convocatoria sa_convocatoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_convocatoria
    ADD CONSTRAINT sa_convocatoria_pkey PRIMARY KEY (id);


--
-- Name: sa_convocatoria_tokens sa_convocatoria_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_convocatoria_tokens
    ADD CONSTRAINT sa_convocatoria_tokens_pkey PRIMARY KEY (id);


--
-- Name: sa_convocatoria_tokens sa_convocatoria_tokens_servicio_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_convocatoria_tokens
    ADD CONSTRAINT sa_convocatoria_tokens_servicio_id_key UNIQUE (servicio_id);


--
-- Name: sa_estructura sa_estructura_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_estructura
    ADD CONSTRAINT sa_estructura_pkey PRIMARY KEY (id);


--
-- Name: sa_estructura sa_estructura_servicio_agente_turno_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_estructura
    ADD CONSTRAINT sa_estructura_servicio_agente_turno_key UNIQUE (servicio_id, agente_id, turno_id);


--
-- Name: sa_modulos_agente sa_modulos_agente_agente_id_servicio_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_modulos_agente
    ADD CONSTRAINT sa_modulos_agente_agente_id_servicio_id_key UNIQUE (agente_id, servicio_id);


--
-- Name: sa_modulos_agente sa_modulos_agente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_modulos_agente
    ADD CONSTRAINT sa_modulos_agente_pkey PRIMARY KEY (id);


--
-- Name: sa_penalizaciones sa_penalizaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_penalizaciones
    ADD CONSTRAINT sa_penalizaciones_pkey PRIMARY KEY (id);


--
-- Name: sa_postulante_turnos sa_postulante_turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulante_turnos
    ADD CONSTRAINT sa_postulante_turnos_pkey PRIMARY KEY (id);


--
-- Name: sa_postulante_turnos sa_postulante_turnos_postulante_id_turno_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulante_turnos
    ADD CONSTRAINT sa_postulante_turnos_postulante_id_turno_id_key UNIQUE (postulante_id, turno_id);


--
-- Name: sa_postulantes sa_postulantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulantes
    ADD CONSTRAINT sa_postulantes_pkey PRIMARY KEY (id);


--
-- Name: sa_postulantes sa_postulantes_servicio_id_agente_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulantes
    ADD CONSTRAINT sa_postulantes_servicio_id_agente_id_key UNIQUE (servicio_id, agente_id);


--
-- Name: sa_presentismo sa_presentismo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_presentismo
    ADD CONSTRAINT sa_presentismo_pkey PRIMARY KEY (id);


--
-- Name: sa_presentismo sa_presentismo_servicio_agente_turno_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_presentismo
    ADD CONSTRAINT sa_presentismo_servicio_agente_turno_key UNIQUE (servicio_id, agente_id, turno_id);


--
-- Name: sa_recursos_estado sa_recursos_estado_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_recursos_estado
    ADD CONSTRAINT sa_recursos_estado_pkey PRIMARY KEY (id);


--
-- Name: sa_recursos_estado sa_recursos_estado_servicio_id_recurso_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_recursos_estado
    ADD CONSTRAINT sa_recursos_estado_servicio_id_recurso_id_key UNIQUE (servicio_id, recurso_id);


--
-- Name: sa_requerimientos sa_requerimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_requerimientos
    ADD CONSTRAINT sa_requerimientos_pkey PRIMARY KEY (id);


--
-- Name: sa_requerimientos sa_requerimientos_servicio_id_rol_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_requerimientos
    ADD CONSTRAINT sa_requerimientos_servicio_id_rol_key UNIQUE (servicio_id, rol);


--
-- Name: sa_sanciones sa_sanciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_sanciones
    ADD CONSTRAINT sa_sanciones_pkey PRIMARY KEY (id);


--
-- Name: sa_scoring_config sa_scoring_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_scoring_config
    ADD CONSTRAINT sa_scoring_config_pkey PRIMARY KEY (clave);


--
-- Name: sa_turnos sa_turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_turnos
    ADD CONSTRAINT sa_turnos_pkey PRIMARY KEY (id);


--
-- Name: servicio_documentos servicio_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicio_documentos
    ADD CONSTRAINT servicio_documentos_pkey PRIMARY KEY (id);


--
-- Name: servicios_adicionales servicios_adicionales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_adicionales
    ADD CONSTRAINT servicios_adicionales_pkey PRIMARY KEY (id);


--
-- Name: servicios servicios_numero_servicio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_numero_servicio_key UNIQUE (numero_servicio);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id);


--
-- Name: sistema_config sistema_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sistema_config
    ADD CONSTRAINT sistema_config_pkey PRIMARY KEY (clave);


--
-- Name: valor_uf_historico valor_uf_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.valor_uf_historico
    ADD CONSTRAINT valor_uf_historico_pkey PRIMARY KEY (id);


--
-- Name: idx_beneficiario_documentos_benef; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiario_documentos_benef ON public.beneficiario_documentos USING btree (beneficiario_id);


--
-- Name: idx_elementos_fase_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_elementos_fase_id ON public.os_adicional_elementos USING btree (fase_id);


--
-- Name: idx_fac_item_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fac_item_profile ON public.facturacion_items USING btree (profile_id);


--
-- Name: idx_fac_item_solicitud; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fac_item_solicitud ON public.facturacion_items USING btree (solicitud_id);


--
-- Name: idx_fac_item_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fac_item_token ON public.facturacion_items USING btree (token);


--
-- Name: idx_fac_sol_servicio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fac_sol_servicio ON public.facturacion_solicitudes USING btree (servicio_id);


--
-- Name: idx_liq_detalle_liq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_liq_detalle_liq ON public.liquidacion_detalle USING btree (liquidacion_id);


--
-- Name: idx_liquidaciones_rango; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_liquidaciones_rango ON public.liquidaciones USING btree (fecha_desde, fecha_hasta);


--
-- Name: idx_os_adicional_fases_turno; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_os_adicional_fases_turno ON public.os_adicional_fases USING btree (turno_id);


--
-- Name: idx_os_adicional_turnos_os; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_os_adicional_turnos_os ON public.os_adicional_turnos USING btree (os_adicional_id);


--
-- Name: idx_os_item_fechas_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_os_item_fechas_fecha ON public.os_item_fechas USING btree (fecha);


--
-- Name: idx_os_item_fechas_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_os_item_fechas_item ON public.os_item_fechas USING btree (os_item_id);


--
-- Name: idx_os_item_relevos_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_os_item_relevos_item ON public.os_item_relevos USING btree (os_item_id);


--
-- Name: idx_os_item_turnos_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_os_item_turnos_item ON public.os_item_turnos USING btree (os_item_id);


--
-- Name: idx_presentismo_liquidacion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_presentismo_liquidacion ON public.sa_presentismo USING btree (liquidacion_id);


--
-- Name: idx_presupuestos_beneficiario_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_presupuestos_beneficiario_id ON public.presupuestos USING btree (beneficiario_id);


--
-- Name: idx_revoked_tokens_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_revoked_tokens_expires ON public.revoked_tokens USING btree (expires_at);


--
-- Name: idx_sa_conv_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_conv_tokens_token ON public.sa_convocatoria_tokens USING btree (token);


--
-- Name: idx_sa_estructura_servicio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_estructura_servicio ON public.sa_estructura USING btree (servicio_id);


--
-- Name: idx_sa_estructura_turno; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_estructura_turno ON public.sa_estructura USING btree (turno_id);


--
-- Name: idx_sa_modulos_agente_periodo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_modulos_agente_periodo ON public.sa_modulos_agente USING btree (agente_id, periodo);


--
-- Name: idx_sa_penalizaciones_agente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_penalizaciones_agente ON public.sa_penalizaciones USING btree (agente_id, activa);


--
-- Name: idx_sa_postulantes_servicio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_postulantes_servicio ON public.sa_postulantes USING btree (servicio_id);


--
-- Name: idx_sa_presentismo_turno; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_presentismo_turno ON public.sa_presentismo USING btree (turno_id);


--
-- Name: idx_sa_recursos_estado_servicio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_recursos_estado_servicio ON public.sa_recursos_estado USING btree (servicio_id);


--
-- Name: idx_sa_sanciones_activa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_sanciones_activa ON public.sa_sanciones USING btree (fecha_fin);


--
-- Name: idx_sa_sanciones_agente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_sanciones_agente ON public.sa_sanciones USING btree (agente_id);


--
-- Name: idx_sa_turnos_servicio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sa_turnos_servicio ON public.sa_turnos USING btree (servicio_id);


--
-- Name: idx_servicios_adicionales_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicios_adicionales_estado ON public.servicios_adicionales USING btree (estado);


--
-- Name: idx_uf_vigente_desde; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_uf_vigente_desde ON public.valor_uf_historico USING btree (vigente_desde);


--
-- Name: profiles_cuit_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profiles_cuit_unique ON public.profiles USING btree (cuit) WHERE (cuit IS NOT NULL);


--
-- Name: presupuestos trg_presupuesto_numero; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_presupuesto_numero BEFORE INSERT ON public.presupuestos FOR EACH ROW EXECUTE FUNCTION public.fn_generar_numero_presupuesto();


--
-- Name: actividad actividad_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: actividad actividad_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id);


--
-- Name: actividad actividad_mision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividad
    ADD CONSTRAINT actividad_mision_id_fkey FOREIGN KEY (mision_id) REFERENCES public.misiones(id) ON DELETE SET NULL;


--
-- Name: beneficiario_documentos beneficiario_documentos_beneficiario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiario_documentos
    ADD CONSTRAINT beneficiario_documentos_beneficiario_id_fkey FOREIGN KEY (beneficiario_id) REFERENCES public.beneficiarios(id) ON DELETE CASCADE;


--
-- Name: beneficiario_documentos beneficiario_documentos_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiario_documentos
    ADD CONSTRAINT beneficiario_documentos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: facturacion_items facturacion_items_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_items
    ADD CONSTRAINT facturacion_items_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: facturacion_items facturacion_items_revisada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_items
    ADD CONSTRAINT facturacion_items_revisada_por_fkey FOREIGN KEY (revisada_por) REFERENCES public.profiles(id);


--
-- Name: facturacion_items facturacion_items_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_items
    ADD CONSTRAINT facturacion_items_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES public.facturacion_solicitudes(id) ON DELETE CASCADE;


--
-- Name: facturacion_solicitudes facturacion_solicitudes_generado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_solicitudes
    ADD CONSTRAINT facturacion_solicitudes_generado_por_fkey FOREIGN KEY (generado_por) REFERENCES public.profiles(id);


--
-- Name: facturacion_solicitudes facturacion_solicitudes_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturacion_solicitudes
    ADD CONSTRAINT facturacion_solicitudes_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE SET NULL;


--
-- Name: grupo_reglas grupo_reglas_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grupo_reglas
    ADD CONSTRAINT grupo_reglas_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: interrupciones interrupciones_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interrupciones
    ADD CONSTRAINT interrupciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id);


--
-- Name: interrupciones interrupciones_mision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interrupciones
    ADD CONSTRAINT interrupciones_mision_id_fkey FOREIGN KEY (mision_id) REFERENCES public.misiones(id) ON DELETE CASCADE;


--
-- Name: liquidacion_detalle liquidacion_detalle_liquidacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_liquidacion_id_fkey FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones(id) ON DELETE CASCADE;


--
-- Name: liquidacion_detalle liquidacion_detalle_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: liquidaciones liquidaciones_generado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_generado_por_fkey FOREIGN KEY (generado_por) REFERENCES public.profiles(id);


--
-- Name: mision_agentes mision_agentes_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mision_agentes
    ADD CONSTRAINT mision_agentes_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id);


--
-- Name: mision_agentes mision_agentes_mision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mision_agentes
    ADD CONSTRAINT mision_agentes_mision_id_fkey FOREIGN KEY (mision_id) REFERENCES public.misiones(id) ON DELETE CASCADE;


--
-- Name: misiones misiones_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.misiones
    ADD CONSTRAINT misiones_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id);


--
-- Name: misiones misiones_encargado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.misiones
    ADD CONSTRAINT misiones_encargado_id_fkey FOREIGN KEY (encargado_id) REFERENCES public.profiles(id);


--
-- Name: misiones misiones_os_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.misiones
    ADD CONSTRAINT misiones_os_item_id_fkey FOREIGN KEY (os_item_id) REFERENCES public.os_items(id) ON DELETE SET NULL;


--
-- Name: ordenes_servicio ordenes_servicio_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_servicio
    ADD CONSTRAINT ordenes_servicio_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id);


--
-- Name: ordenes_servicio ordenes_servicio_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_servicio
    ADD CONSTRAINT ordenes_servicio_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- Name: os_adicional os_adicional_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional
    ADD CONSTRAINT os_adicional_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE SET NULL;


--
-- Name: os_adicional os_adicional_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional
    ADD CONSTRAINT os_adicional_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: os_adicional_elementos os_adicional_elementos_fase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_elementos
    ADD CONSTRAINT os_adicional_elementos_fase_id_fkey FOREIGN KEY (fase_id) REFERENCES public.os_adicional_fases(id) ON DELETE CASCADE;


--
-- Name: os_adicional_elementos os_adicional_elementos_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_elementos
    ADD CONSTRAINT os_adicional_elementos_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.os_adicional_zonas(id) ON DELETE CASCADE;


--
-- Name: os_adicional_fase_zonas os_adicional_fase_zonas_fase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fase_zonas
    ADD CONSTRAINT os_adicional_fase_zonas_fase_id_fkey FOREIGN KEY (fase_id) REFERENCES public.os_adicional_fases(id) ON DELETE CASCADE;


--
-- Name: os_adicional_fase_zonas os_adicional_fase_zonas_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fase_zonas
    ADD CONSTRAINT os_adicional_fase_zonas_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.os_adicional_zonas(id) ON DELETE CASCADE;


--
-- Name: os_adicional_fases os_adicional_fases_os_adicional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fases
    ADD CONSTRAINT os_adicional_fases_os_adicional_id_fkey FOREIGN KEY (os_adicional_id) REFERENCES public.os_adicional(id) ON DELETE CASCADE;


--
-- Name: os_adicional_fases os_adicional_fases_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fases
    ADD CONSTRAINT os_adicional_fases_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.os_adicional_turnos(id) ON DELETE SET NULL;


--
-- Name: os_adicional_fechas os_adicional_fechas_os_adicional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_fechas
    ADD CONSTRAINT os_adicional_fechas_os_adicional_id_fkey FOREIGN KEY (os_adicional_id) REFERENCES public.os_adicional(id) ON DELETE CASCADE;


--
-- Name: os_adicional_recursos os_adicional_recursos_os_adicional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_recursos
    ADD CONSTRAINT os_adicional_recursos_os_adicional_id_fkey FOREIGN KEY (os_adicional_id) REFERENCES public.os_adicional(id) ON DELETE CASCADE;


--
-- Name: os_adicional os_adicional_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional
    ADD CONSTRAINT os_adicional_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON DELETE SET NULL;


--
-- Name: os_adicional_turnos os_adicional_turnos_os_adicional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_turnos
    ADD CONSTRAINT os_adicional_turnos_os_adicional_id_fkey FOREIGN KEY (os_adicional_id) REFERENCES public.os_adicional(id) ON DELETE CASCADE;


--
-- Name: os_adicional os_adicional_validado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional
    ADD CONSTRAINT os_adicional_validado_por_fkey FOREIGN KEY (validado_por) REFERENCES public.profiles(id);


--
-- Name: os_adicional_zonas os_adicional_zonas_os_adicional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_adicional_zonas
    ADD CONSTRAINT os_adicional_zonas_os_adicional_id_fkey FOREIGN KEY (os_adicional_id) REFERENCES public.os_adicional(id) ON DELETE CASCADE;


--
-- Name: os_alcoholemia_accesos os_alcoholemia_accesos_os_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_alcoholemia_accesos
    ADD CONSTRAINT os_alcoholemia_accesos_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE;


--
-- Name: os_fechas os_fechas_os_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_fechas
    ADD CONSTRAINT os_fechas_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE;


--
-- Name: os_item_fechas os_item_fechas_os_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_fechas
    ADD CONSTRAINT os_item_fechas_os_item_id_fkey FOREIGN KEY (os_item_id) REFERENCES public.os_items(id) ON DELETE CASCADE;


--
-- Name: os_item_relevos os_item_relevos_os_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_relevos
    ADD CONSTRAINT os_item_relevos_os_item_id_fkey FOREIGN KEY (os_item_id) REFERENCES public.os_items(id) ON DELETE CASCADE;


--
-- Name: os_item_turnos os_item_turnos_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_turnos
    ADD CONSTRAINT os_item_turnos_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id);


--
-- Name: os_item_turnos os_item_turnos_coordinador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_turnos
    ADD CONSTRAINT os_item_turnos_coordinador_id_fkey FOREIGN KEY (coordinador_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: os_item_turnos os_item_turnos_os_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_item_turnos
    ADD CONSTRAINT os_item_turnos_os_item_id_fkey FOREIGN KEY (os_item_id) REFERENCES public.os_items(id) ON DELETE CASCADE;


--
-- Name: os_items os_items_os_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_items
    ADD CONSTRAINT os_items_os_id_fkey FOREIGN KEY (os_id) REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE;


--
-- Name: os_items os_items_relevo_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_items
    ADD CONSTRAINT os_items_relevo_base_id_fkey FOREIGN KEY (relevo_base_id) REFERENCES public.bases(id);


--
-- Name: presupuestos presupuestos_beneficiario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presupuestos
    ADD CONSTRAINT presupuestos_beneficiario_id_fkey FOREIGN KEY (beneficiario_id) REFERENCES public.beneficiarios(id) ON DELETE SET NULL;


--
-- Name: presupuestos presupuestos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presupuestos
    ADD CONSTRAINT presupuestos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id);


--
-- Name: refresh_tokens refresh_tokens_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sa_convocatoria sa_convocatoria_confirmado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_convocatoria
    ADD CONSTRAINT sa_convocatoria_confirmado_por_fkey FOREIGN KEY (confirmado_por) REFERENCES public.profiles(id);


--
-- Name: sa_convocatoria sa_convocatoria_estructura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_convocatoria
    ADD CONSTRAINT sa_convocatoria_estructura_id_fkey FOREIGN KEY (estructura_id) REFERENCES public.sa_estructura(id) ON DELETE CASCADE;


--
-- Name: sa_convocatoria_tokens sa_convocatoria_tokens_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_convocatoria_tokens
    ADD CONSTRAINT sa_convocatoria_tokens_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: sa_estructura sa_estructura_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_estructura
    ADD CONSTRAINT sa_estructura_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sa_estructura sa_estructura_jefe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_estructura
    ADD CONSTRAINT sa_estructura_jefe_id_fkey FOREIGN KEY (jefe_id) REFERENCES public.sa_estructura(id) ON DELETE SET NULL;


--
-- Name: sa_estructura sa_estructura_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_estructura
    ADD CONSTRAINT sa_estructura_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: sa_estructura sa_estructura_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_estructura
    ADD CONSTRAINT sa_estructura_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.sa_turnos(id) ON DELETE CASCADE;


--
-- Name: sa_modulos_agente sa_modulos_agente_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_modulos_agente
    ADD CONSTRAINT sa_modulos_agente_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sa_modulos_agente sa_modulos_agente_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_modulos_agente
    ADD CONSTRAINT sa_modulos_agente_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: sa_penalizaciones sa_penalizaciones_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_penalizaciones
    ADD CONSTRAINT sa_penalizaciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sa_penalizaciones sa_penalizaciones_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_penalizaciones
    ADD CONSTRAINT sa_penalizaciones_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- Name: sa_penalizaciones sa_penalizaciones_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_penalizaciones
    ADD CONSTRAINT sa_penalizaciones_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE SET NULL;


--
-- Name: sa_postulante_turnos sa_postulante_turnos_postulante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulante_turnos
    ADD CONSTRAINT sa_postulante_turnos_postulante_id_fkey FOREIGN KEY (postulante_id) REFERENCES public.sa_postulantes(id) ON DELETE CASCADE;


--
-- Name: sa_postulante_turnos sa_postulante_turnos_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulante_turnos
    ADD CONSTRAINT sa_postulante_turnos_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.sa_turnos(id) ON DELETE CASCADE;


--
-- Name: sa_postulantes sa_postulantes_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulantes
    ADD CONSTRAINT sa_postulantes_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sa_postulantes sa_postulantes_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_postulantes
    ADD CONSTRAINT sa_postulantes_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: sa_presentismo sa_presentismo_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_presentismo
    ADD CONSTRAINT sa_presentismo_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sa_presentismo sa_presentismo_liquidacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_presentismo
    ADD CONSTRAINT sa_presentismo_liquidacion_id_fkey FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones(id);


--
-- Name: sa_presentismo sa_presentismo_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_presentismo
    ADD CONSTRAINT sa_presentismo_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.profiles(id);


--
-- Name: sa_presentismo sa_presentismo_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_presentismo
    ADD CONSTRAINT sa_presentismo_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: sa_presentismo sa_presentismo_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_presentismo
    ADD CONSTRAINT sa_presentismo_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.sa_turnos(id) ON DELETE SET NULL;


--
-- Name: sa_recursos_estado sa_recursos_estado_recurso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_recursos_estado
    ADD CONSTRAINT sa_recursos_estado_recurso_id_fkey FOREIGN KEY (recurso_id) REFERENCES public.os_adicional_recursos(id) ON DELETE CASCADE;


--
-- Name: sa_recursos_estado sa_recursos_estado_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_recursos_estado
    ADD CONSTRAINT sa_recursos_estado_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: sa_recursos_estado sa_recursos_estado_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_recursos_estado
    ADD CONSTRAINT sa_recursos_estado_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: sa_requerimientos sa_requerimientos_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_requerimientos
    ADD CONSTRAINT sa_requerimientos_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: sa_sanciones sa_sanciones_agente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_sanciones
    ADD CONSTRAINT sa_sanciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sa_sanciones sa_sanciones_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_sanciones
    ADD CONSTRAINT sa_sanciones_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- Name: sa_sanciones sa_sanciones_propuesto_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_sanciones
    ADD CONSTRAINT sa_sanciones_propuesto_por_fkey FOREIGN KEY (propuesto_por) REFERENCES public.profiles(id);


--
-- Name: sa_turnos sa_turnos_os_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_turnos
    ADD CONSTRAINT sa_turnos_os_turno_id_fkey FOREIGN KEY (os_turno_id) REFERENCES public.os_adicional_turnos(id) ON DELETE SET NULL;


--
-- Name: sa_turnos sa_turnos_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sa_turnos
    ADD CONSTRAINT sa_turnos_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios_adicionales(id) ON DELETE CASCADE;


--
-- Name: servicio_documentos servicio_documentos_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicio_documentos
    ADD CONSTRAINT servicio_documentos_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON DELETE CASCADE;


--
-- Name: servicio_documentos servicio_documentos_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicio_documentos
    ADD CONSTRAINT servicio_documentos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: servicios_adicionales servicios_adicionales_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_adicionales
    ADD CONSTRAINT servicios_adicionales_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- Name: servicios_adicionales servicios_adicionales_os_adicional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_adicionales
    ADD CONSTRAINT servicios_adicionales_os_adicional_id_fkey FOREIGN KEY (os_adicional_id) REFERENCES public.os_adicional(id) ON DELETE SET NULL;


--
-- Name: servicios_adicionales servicios_adicionales_sa_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_adicionales
    ADD CONSTRAINT servicios_adicionales_sa_base_id_fkey FOREIGN KEY (sa_base_id) REFERENCES public.bases(id);


--
-- Name: servicios_adicionales servicios_adicionales_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_adicionales
    ADD CONSTRAINT servicios_adicionales_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON DELETE SET NULL;


--
-- Name: servicios servicios_cancelado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_cancelado_por_fkey FOREIGN KEY (cancelado_por) REFERENCES public.profiles(id);


--
-- Name: servicios servicios_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: servicios servicios_presupuesto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_presupuesto_id_fkey FOREIGN KEY (presupuesto_id) REFERENCES public.presupuestos(id) ON DELETE SET NULL;


--
-- Name: sistema_config sistema_config_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sistema_config
    ADD CONSTRAINT sistema_config_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.profiles(id);


--
-- Name: valor_uf_historico valor_uf_historico_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.valor_uf_historico
    ADD CONSTRAINT valor_uf_historico_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- PostgreSQL database dump complete
--


