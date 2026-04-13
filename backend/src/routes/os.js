const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const https = require('https');
const { authMiddleware, requireRole } = require('../middleware/auth');

const ROLES_OS_WRITE   = ['admin', 'director', 'gerencia', 'planeamiento', 'jefe_cgm', 'coordinador_cgm'];
const ROLES_OS_APROBAR = ['admin', 'director', 'gerencia'];

const COMUNAS_CABA = [
  'Comuna 1','Comuna 2','Comuna 3','Comuna 4','Comuna 5','Comuna 6','Comuna 7',
  'Comuna 8','Comuna 9','Comuna 10','Comuna 11','Comuna 12','Comuna 13','Comuna 14','Comuna 15',
];

// ── HELPER USIG datos_utiles ──────────────────────────────────
function usigDatosUtiles({ lat, lng, calle, altura, calle2 }) {
  return new Promise((resolve) => {
    let url;
    if (lat && lng) {
      url = `https://ws.usig.buenosaires.gob.ar/datos_utiles?x=${lng}&y=${lat}`;
    } else if (calle && altura) {
      url = `https://ws.usig.buenosaires.gob.ar/datos_utiles?calle=${encodeURIComponent(calle)}&altura=${encodeURIComponent(altura)}`;
    } else if (calle && calle2) {
      url = `https://ws.usig.buenosaires.gob.ar/datos_utiles?calle=${encodeURIComponent(calle + ' y ' + calle2)}`;
    } else {
      return resolve(null);
    }
    const req = https.get(url, { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const obj = Array.isArray(json) ? json[0] : json;
          if (obj && obj.comuna) resolve({ comuna: obj.comuna, barrio: obj.barrio || null });
          else resolve(null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── HELPER calcularStats ──────────────────────────────────────
function calcularStats(items) {
  const porTurno   = {};
  const porComuna  = {};
  const porEjePSV  = {};
  let totalAgentes = 0;
  let sinUbicacion = 0;
  let sinComuna    = 0;
  let sinEjePSV    = 0;
  let sinAgentes   = 0;
  const comunasSet = new Set();

  for (const it of items) {
    const turnos = it.turnos || [];

    if (it.tipo === 'servicio') {
      if (turnos.length === 0) {
        const t = it.turno || 'sin_turno';
        if (!porTurno[t]) porTurno[t] = { servicios: 0, misiones: 0, agentes: 0 };
        porTurno[t].servicios++;
        sinAgentes++;
      } else {
        turnos.forEach(eslabon => {
          const t = eslabon.turno || 'sin_turno';
          const ag = eslabon.cantidad_agentes || 0;
          if (!porTurno[t]) porTurno[t] = { servicios: 0, misiones: 0, agentes: 0 };
          porTurno[t].servicios++;
          porTurno[t].agentes += ag;
          totalAgentes += ag;
        });
        const agTotal = turnos.reduce((s, e) => s + (e.cantidad_agentes || 0), 0);
        if (agTotal === 0) sinAgentes++;
      }
    } else {
      const t = (turnos[0] && turnos[0].turno) || it.turno || 'sin_turno';
      if (!porTurno[t]) porTurno[t] = { servicios: 0, misiones: 0, agentes: 0 };
      porTurno[t].misiones++;
    }

    const com = it.comuna || null;
    if (com) {
      comunasSet.add(com);
      if (!porComuna[com]) porComuna[com] = { servicios: 0, misiones: 0, agentes: 0, barrio: it.barrio };
      if (it.tipo === 'servicio') {
        porComuna[com].servicios++;
        const agItem = turnos.reduce((acc, e) => acc + (e.cantidad_agentes || 0), 0);
        porComuna[com].agentes += agItem;
      } else {
        porComuna[com].misiones++;
      }
    } else {
      sinComuna++;
    }

    const eje = it.eje_psv || null;
    if (eje) {
      if (!porEjePSV[eje]) porEjePSV[eje] = { servicios: 0, misiones: 0 };
      if (it.tipo === 'servicio') porEjePSV[eje].servicios++;
      else porEjePSV[eje].misiones++;
    } else {
      sinEjePSV++;
    }

    if (!it.lat && !it.lng && !it.calle) sinUbicacion++;
  }

  return {
    totales: {
      items:     items.length,
      servicios: items.filter(i => i.tipo === 'servicio').length,
      misiones:  items.filter(i => i.tipo === 'mision').length,
      agentes:   totalAgentes,
      comunas:   comunasSet.size,
    },
    alertas: { sin_ubicacion: sinUbicacion, sin_comuna: sinComuna, sin_eje_psv: sinEjePSV, sin_agentes: sinAgentes },
    por_turno:   porTurno,
    por_comuna:  porComuna,
    por_eje_psv: porEjePSV,
  };
}

// ─────────────────────────────────────────────────────────────
// RUTAS CON PREFIJO FIJO — van ANTES de /:id
// ─────────────────────────────────────────────────────────────

// PATCH /api/os/items/:id/comuna
router.patch('/items/:id/comuna', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const { comuna, barrio } = req.body;
  if (!comuna) return res.status(400).json({ error: 'La comuna es obligatoria' });
  if (!COMUNAS_CABA.includes(comuna)) return res.status(400).json({ error: 'Comuna invalida' });
  try {
    const result = await pool.query(
      `UPDATE os_items SET comuna = $1, barrio = $2, updated_at = NOW()
       WHERE id = $3 RETURNING id, comuna, barrio`,
      [comuna, barrio || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Item no encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en PATCH /os/items/:id/comuna:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/os/items/:id
router.put('/items/:id', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const campos = [
    'descripcion', 'turno', 'modo_ubicacion', 'calle', 'altura', 'calle2',
    'desde', 'hasta', 'poligono_desc', 'poligono_coords', 'eje_psv', 'relevo_tipo',
    'relevo_base_id', 'relevo_turno', 'lat', 'lng', 'place_id', 'cantidad_agentes', 'instrucciones',
  ];
  const fields = [], params = [];
  for (const campo of campos) {
    if (req.body[campo] !== undefined) {
      params.push(campo === 'cantidad_agentes' ? JSON.stringify(req.body[campo]) : req.body[campo]);
      fields.push(`${campo} = $${params.length}`);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  params.push(new Date()); fields.push(`updated_at = $${params.length}`);
  params.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE os_items SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Item no encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en PUT /os/items/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/os/items/:id
router.delete('/items/:id', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  try {
    await pool.query(`DELETE FROM os_items WHERE id = $1`, [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /os/items/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os/items/:id/turnos
router.post('/items/:id/turnos', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const { turnos, relevos } = req.body;
  if (!Array.isArray(turnos) || turnos.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un turno' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM os_item_turnos WHERE os_item_id = $1`, [req.params.id]);
    await client.query(`DELETE FROM os_item_relevos WHERE os_item_id = $1`, [req.params.id]);
    for (const t of turnos) {
      await client.query(
        `INSERT INTO os_item_turnos (os_item_id, orden, turno, base_id, cantidad_agentes) VALUES ($1,$2,$3,$4,$5)`,
        [req.params.id, t.orden ?? 0, t.turno, t.base_id || null, t.cantidad_agentes ?? 1]
      );
    }
    if (Array.isArray(relevos)) {
      for (const r of relevos) {
        await client.query(
          `INSERT INTO os_item_relevos (os_item_id, orden, tipo) VALUES ($1,$2,$3)`,
          [req.params.id, r.orden ?? 0, r.tipo || 'Normal']
        );
      }
    }
    await client.query('COMMIT');
    const turnosRes  = await pool.query(
      `SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = $1 ORDER BY t.orden`,
      [req.params.id]
    );
    const relevosRes = await pool.query(
      `SELECT * FROM os_item_relevos WHERE os_item_id = $1 ORDER BY orden`, [req.params.id]
    );
    return res.json({ turnos: turnosRes.rows, relevos: relevosRes.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en POST /os/items/:id/turnos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// GET /api/os/items/:id
router.get('/items/:id', authMiddleware, async (req, res) => {
  try {
    const item = await pool.query(
      `SELECT oi.*, b.nombre as relevo_base_nombre FROM os_items oi LEFT JOIN bases b ON oi.relevo_base_id = b.id WHERE oi.id = $1`,
      [req.params.id]
    );
    if (!item.rows[0]) return res.status(404).json({ error: 'Item no encontrado' });
    const turnos  = await pool.query(
      `SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = $1 ORDER BY t.orden`,
      [req.params.id]
    );
    const relevos = await pool.query(
      `SELECT * FROM os_item_relevos WHERE os_item_id = $1 ORDER BY orden`, [req.params.id]
    );
    return res.json({ ...item.rows[0], turnos: turnos.rows, relevos: relevos.rows });
  } catch (err) {
    console.error('Error en GET /os/items/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// RUTAS COLECCION
// ─────────────────────────────────────────────────────────────

// GET /api/os — UNION de ordenes_servicio + os_adicional
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let baseId = null;
    if (!['gerencia','admin','director'].includes(user.role)) baseId = user.base_id;
    else if (req.query.base_id) baseId = req.query.base_id;

    // Construir filtros dinamicamente para el UNION
    // Ambas ramas del UNION usan los mismos parametros ($1, $2...)
    const params = [];
    let bf1 = '', bf2 = '', ef1 = '', ef2 = '';

    if (baseId) {
      params.push(baseId);
      const n = params.length;
      bf1 = ' AND os.base_id = $' + n;
      bf2 = ' AND oa.base_id = $' + n;
    }
    if (req.query.estado) {
      params.push(req.query.estado);
      const n = params.length;
      ef1 = ' AND os.estado = $' + n;
      ef2 = ' AND oa.estado = $' + n;
    }

    const query =
      'SELECT os.id, os.titulo as titulo, os.tipo, os.estado, os.base_id,' +
      ' os.numero, os.semana_inicio, os.semana_fin,' +
      ' os.creado_por, os.created_at, os.updated_at,' +
      ' b.nombre as base_nombre, p.nombre_completo as creado_por_nombre' +
      ' FROM ordenes_servicio os' +
      ' LEFT JOIN bases b ON os.base_id = b.id' +
      ' LEFT JOIN profiles p ON os.creado_por = p.id' +
      ' WHERE 1=1' + bf1 + ef1 +
      ' UNION ALL' +
      ' SELECT oa.id, oa.nombre as titulo, \'adicional\' as tipo, oa.estado, oa.base_id,' +
      ' NULL::integer as numero, NULL::date as semana_inicio, NULL::date as semana_fin,' +
      ' oa.creado_por, oa.created_at, oa.updated_at,' +
      ' b.nombre as base_nombre, p.nombre_completo as creado_por_nombre' +
      ' FROM os_adicional oa' +
      ' LEFT JOIN bases b ON oa.base_id = b.id' +
      ' LEFT JOIN profiles p ON oa.creado_por = p.id' +
      ' WHERE 1=1' + bf2 + ef2 +
      ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const rows = result.rows;

    const idsOrdinarias  = rows.filter(r => r.tipo !== 'adicional').map(r => r.id);
    const idsAdicionales = rows.filter(r => r.tipo === 'adicional').map(r => r.id);
    const fechasMap = {};

    if (idsOrdinarias.length > 0) {
      const fRes = await pool.query(
        'SELECT os_id, fecha FROM os_fechas WHERE os_id = ANY($1) ORDER BY fecha',
        [idsOrdinarias]
      );
      fRes.rows.forEach(f => {
        const iso = f.fecha.toISOString().slice(0, 10);
        if (!fechasMap[f.os_id]) fechasMap[f.os_id] = [];
        fechasMap[f.os_id].push(iso);
      });
    }

    if (idsAdicionales.length > 0) {
      const fRes = await pool.query(
        'SELECT os_adicional_id, fecha FROM os_adicional_fechas WHERE os_adicional_id = ANY($1) ORDER BY fecha',
        [idsAdicionales]
      );
      fRes.rows.forEach(f => {
        const iso = f.fecha.toISOString().slice(0, 10);
        if (!fechasMap[f.os_adicional_id]) fechasMap[f.os_adicional_id] = [];
        fechasMap[f.os_adicional_id].push(iso);
      });
    }

    return res.json(rows.map(os => ({ ...os, fechas: fechasMap[os.id] || [] })));
  } catch (err) {
    console.error('Error en GET /os:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os
router.post('/', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const { titulo, tipo, semana_inicio, semana_fin, base_id } = req.body;
  if (!titulo) return res.status(400).json({ error: 'El titulo es obligatorio' });
  const tipoOS = tipo || 'ordinaria';
  if (!['ordinaria','adicional','alcoholemia'].includes(tipoOS)) {
    return res.status(400).json({ error: 'Tipo de OS invalido' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO ordenes_servicio (base_id, titulo, tipo, semana_inicio, semana_fin, creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [base_id || req.user.base_id, titulo, tipoOS, semana_inicio || null, semana_fin || null, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST /os:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// RUTAS CON /:id
// ─────────────────────────────────────────────────────────────

// GET /api/os/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const os = await pool.query(
      `SELECT os.*, b.nombre as base_nombre, p.nombre_completo as creado_por_nombre
       FROM ordenes_servicio os LEFT JOIN bases b ON os.base_id = b.id LEFT JOIN profiles p ON os.creado_por = p.id
       WHERE os.id = $1`,
      [req.params.id]
    );
    if (!os.rows[0]) return res.status(404).json({ error: 'OS no encontrada' });
    const items = await pool.query(
      `SELECT oi.*, b.nombre as relevo_base_nombre FROM os_items oi LEFT JOIN bases b ON oi.relevo_base_id = b.id WHERE oi.os_id = $1 ORDER BY oi.orden, oi.created_at`,
      [req.params.id]
    );
    const fechas = await pool.query(`SELECT fecha FROM os_fechas WHERE os_id = $1 ORDER BY fecha`, [req.params.id]);
    const itemIds = items.rows.map(i => i.id);
    let turnosMap = {}, relevosMap = {};
    if (itemIds.length > 0) {
      const tRes = await pool.query(
        `SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = ANY($1) ORDER BY t.orden`,
        [itemIds]
      );
      tRes.rows.forEach(t => {
        if (!turnosMap[t.os_item_id]) turnosMap[t.os_item_id] = [];
        turnosMap[t.os_item_id].push(t);
      });
      const rRes = await pool.query(
        `SELECT * FROM os_item_relevos WHERE os_item_id = ANY($1) ORDER BY orden`, [itemIds]
      );
      rRes.rows.forEach(r => {
        if (!relevosMap[r.os_item_id]) relevosMap[r.os_item_id] = [];
        relevosMap[r.os_item_id].push(r);
      });
    }
    return res.json({
      ...os.rows[0],
      items: items.rows.map(i => ({ ...i, turnos: turnosMap[i.id] || [], relevos: relevosMap[i.id] || [] })),
      fechas: fechas.rows.map(f => f.fecha.toISOString().slice(0, 10)),
    });
  } catch (err) {
    console.error('Error en GET /os/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/os/:id/resumen
router.get('/:id/resumen', authMiddleware, async (req, res) => {
  try {
    const osRes = await pool.query(
      `SELECT os.*, b.nombre as base_nombre FROM ordenes_servicio os LEFT JOIN bases b ON os.base_id = b.id WHERE os.id = $1`,
      [req.params.id]
    );
    if (!osRes.rows[0]) return res.status(404).json({ error: 'OS no encontrada' });

    const itemsRes = await pool.query(
      `SELECT oi.* FROM os_items oi WHERE oi.os_id = $1 ORDER BY oi.orden, oi.created_at`,
      [req.params.id]
    );
    const items = itemsRes.rows;
    const itemIds = items.map(i => i.id);

    let turnosMap = {};
    if (itemIds.length > 0) {
      const tRes = await pool.query(
        `SELECT t.*, b.nombre as base_nombre FROM os_item_turnos t LEFT JOIN bases b ON t.base_id = b.id WHERE t.os_item_id = ANY($1) ORDER BY t.orden`,
        [itemIds]
      );
      tRes.rows.forEach(t => {
        if (!turnosMap[t.os_item_id]) turnosMap[t.os_item_id] = [];
        turnosMap[t.os_item_id].push(t);
      });
    }

    const itemsConTurnos = items.map(it => ({
      ...it,
      turnos: turnosMap[it.id] || [],
      turno: (turnosMap[it.id] && turnosMap[it.id][0] && turnosMap[it.id][0].turno) || it.turno,
    }));

    const resoluciones = await Promise.all(
      itemsConTurnos.map(async (item) => {
        if (item.comuna) return { id: item.id, comuna: item.comuna, barrio: item.barrio };
        const resultado = await usigDatosUtiles({
          lat: item.lat, lng: item.lng,
          calle: item.calle, altura: item.altura, calle2: item.calle2,
        });
        if (resultado) {
          pool.query(
            `UPDATE os_items SET comuna = $1, barrio = $2 WHERE id = $3`,
            [resultado.comuna, resultado.barrio, item.id]
          ).catch(() => {});
        }
        return { id: item.id, ...resultado };
      })
    );

    const resMap = Object.fromEntries(resoluciones.map(r => [r.id, r]));
    const itemsEnriquecidos = itemsConTurnos.map(item => ({
      ...item,
      comuna: resMap[item.id]?.comuna || item.comuna || null,
      barrio: resMap[item.id]?.barrio || item.barrio || null,
    }));

    const stats = calcularStats(itemsEnriquecidos);

    const itemsParaFront = itemsEnriquecidos.map(it => ({
      id: it.id,
      tipo: it.tipo,
      codigo: it.codigo,
      descripcion: it.descripcion,
      turno: it.turno,
      turnos: it.turnos,
      modo_ubicacion: it.modo_ubicacion,
      calle: it.calle,
      altura: it.altura,
      calle2: it.calle2,
      desde: it.desde,
      hasta: it.hasta,
      poligono_desc: it.poligono_desc,
      poligono_coords: it.poligono_coords || null,
      eje_psv: it.eje_psv,
      lat: it.lat,
      lng: it.lng,
      comuna: it.comuna,
      barrio: it.barrio,
    }));

    return res.json({
      os: osRes.rows[0],
      stats,
      items: itemsParaFront,
      comunas_disponibles: COMUNAS_CABA,
    });
  } catch (err) {
    console.error('Error en GET /os/:id/resumen:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/os/:id
router.put('/:id', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const { titulo, semana_inicio, semana_fin } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ordenes_servicio SET titulo = COALESCE($1, titulo), semana_inicio = COALESCE($2, semana_inicio), semana_fin = COALESCE($3, semana_fin), updated_at = NOW() WHERE id = $4 AND estado = 'borrador' RETURNING *`,
      [titulo || null, semana_inicio || null, semana_fin || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'OS no encontrada o no editable' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en PUT /os/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os/:id/enviar-validacion
router.post('/:id/enviar-validacion', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE ordenes_servicio SET estado = 'validacion', updated_at = NOW() WHERE id = $1 AND estado = 'borrador' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Solo se puede enviar a validacion una OS en borrador' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en /enviar-validacion:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os/:id/publicar
router.post('/:id/publicar', authMiddleware, requireRole(...ROLES_OS_APROBAR), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE ordenes_servicio SET estado = 'vigente', updated_at = NOW() WHERE id = $1 AND estado = 'validacion' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Solo se puede activar una OS en validacion' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en /publicar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os/:id/cerrar
router.post('/:id/cerrar', authMiddleware, requireRole(...ROLES_OS_APROBAR), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE ordenes_servicio SET estado = 'cumplida', updated_at = NOW() WHERE id = $1 AND estado = 'vigente' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Solo se puede cerrar una OS vigente' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en /cerrar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os/:id/generar-hoy
router.post('/:id/generar-hoy', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const client = await pool.connect();
  try {
    const osRes = await client.query(
      `SELECT * FROM ordenes_servicio WHERE id = $1 AND estado = 'vigente'`, [req.params.id]
    );
    if (!osRes.rows[0]) return res.status(400).json({ error: 'La OS debe estar vigente para generar misiones' });
    const os = osRes.rows[0];
    const hoy = new Date().toISOString().split('T')[0];
    const yaGenerado = await client.query(
      `SELECT COUNT(*) FROM misiones WHERE os_item_id IN (SELECT id FROM os_items WHERE os_id = $1) AND fecha = $2`,
      [req.params.id, hoy]
    );
    if (parseInt(yaGenerado.rows[0].count) > 0) {
      return res.status(409).json({ error: 'Ya se generaron misiones para esta OS hoy', misiones_existentes: parseInt(yaGenerado.rows[0].count) });
    }
    const items = await client.query(
      `SELECT oi.*, t.turno as turno_cadena, t.base_id as base_cadena FROM os_items oi LEFT JOIN os_item_turnos t ON t.os_item_id = oi.id AND t.orden = 0 WHERE oi.os_id = $1 ORDER BY oi.orden, oi.created_at`,
      [req.params.id]
    );
    const misionesCreadas = [];
    await client.query('BEGIN');
    for (const item of items.rows) {
      const baseId = item.base_cadena || os.base_id;
      const turno  = item.turno_cadena || item.turno;
      const m = await client.query(
        `INSERT INTO misiones (os_item_id, base_id, titulo, turno, fecha, tipo, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [item.id, baseId, item.descripcion || 'Sin titulo', turno, hoy, item.tipo, item.modo_ubicacion, item.calle, item.altura, item.calle2, item.desde, item.hasta, item.poligono_desc, item.eje_psv, item.lat, item.lng]
      );
      misionesCreadas.push(m.rows[0].id);
      if (item.relevo_tipo && item.relevo_base_id && item.relevo_turno) {
        const mr = await client.query(
          `INSERT INTO misiones (os_item_id, base_id, titulo, turno, fecha, tipo, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
          [item.id, item.relevo_base_id, `[Relevo ${item.relevo_tipo}] ${item.descripcion || 'Sin titulo'}`, item.relevo_turno, hoy, item.tipo, item.modo_ubicacion, item.calle, item.altura, item.calle2, item.desde, item.hasta, item.poligono_desc, item.eje_psv, item.lat, item.lng]
        );
        misionesCreadas.push(mr.rows[0].id);
      }
    }
    await client.query('COMMIT');
    return res.json({ ok: true, fecha: hoy, misiones_creadas: misionesCreadas.length, ids: misionesCreadas });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en /generar-hoy:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// DELETE /api/os/:id
router.delete('/:id', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM ordenes_servicio WHERE id = $1 AND estado = 'borrador' RETURNING id`, [req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Solo se puede eliminar una OS en borrador' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /os/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os/:id/fechas
router.post('/:id/fechas', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const { fechas } = req.body;
  if (!Array.isArray(fechas) || fechas.length === 0) return res.status(400).json({ error: 'Se requiere un array de fechas' });
  try {
    await pool.query(`DELETE FROM os_fechas WHERE os_id = $1`, [req.params.id]);
    for (const fecha of fechas) {
      await pool.query(`INSERT INTO os_fechas (os_id, fecha) VALUES ($1,$2)`, [req.params.id, fecha]);
    }
    return res.json(await pool.query(`SELECT * FROM os_fechas WHERE os_id = $1 ORDER BY fecha`, [req.params.id]).then(r => r.rows));
  } catch (err) {
    console.error('Error en POST /os/:id/fechas:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/os/:id/items
router.post('/:id/items', authMiddleware, requireRole(...ROLES_OS_WRITE), async (req, res) => {
  const { tipo, descripcion, turno, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, cantidad_agentes, relevo_tipo, relevo_base_id, relevo_turno, lat, lng, place_id, instrucciones, poligono_coords } = req.body;
  if (!tipo || !descripcion) return res.status(400).json({ error: 'Tipo y descripcion son obligatorios' });
  try {
    const os = await pool.query(`SELECT numero FROM ordenes_servicio WHERE id = $1`, [req.params.id]);
    if (!os.rows[0]) return res.status(404).json({ error: 'OS no encontrada' });
    const osNumero = String(os.rows[0].numero || 0).padStart(3, '0');
    const conteo = await pool.query(`SELECT COUNT(*) FROM os_items WHERE os_id = $1 AND tipo = $2`, [req.params.id, tipo]);
    const codigo = `${tipo === 'servicio' ? 'S' : 'M'}${String(parseInt(conteo.rows[0].count) + 1).padStart(3,'0')}/${osNumero}`;
    const ordenRes = await pool.query(`SELECT COUNT(*) FROM os_items WHERE os_id = $1`, [req.params.id]);
    const result = await pool.query(
      `INSERT INTO os_items (os_id, tipo, codigo, descripcion, turno, modo_ubicacion, calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, cantidad_agentes, relevo_tipo, relevo_base_id, relevo_turno, lat, lng, place_id, orden, instrucciones, poligono_coords)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [req.params.id, tipo, codigo, descripcion, turno || 'manana', modo_ubicacion || 'altura', calle || null, altura || null, calle2 || null, desde || null, hasta || null, poligono_desc || null, eje_psv || null, cantidad_agentes ? JSON.stringify(cantidad_agentes) : '{}', relevo_tipo || null, relevo_base_id || null, relevo_turno || null, lat || null, lng || null, place_id || null, parseInt(ordenRes.rows[0].count), instrucciones || null, poligono_coords ? JSON.stringify(poligono_coords) : null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST /os/:id/items:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
