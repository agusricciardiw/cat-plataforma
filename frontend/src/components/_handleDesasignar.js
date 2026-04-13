  async function handleDesasignar(agente) {
    setDesasignando(agente.id)
    const nuevosAgentes = agentesAsignados.filter(a => a.id !== agente.id)
    const nuevo_historial = [...historial, {
      accion: 'desasignado', agente: `${agente.nombre} ${agente.apellido}`,
      agente_id: agente.id, agente_legajo: agente.legajo,
      fecha: new Date().toISOString(), rol,
    }]
    await supabase.from('misiones').update({
      agentes_asignados: nuevosAgentes,
      estado: nuevosAgentes.length === 0 ? 'sin_asignar' : 'asignada',
      historial: nuevo_historial,
    }).eq('id', mision.id)

    // Buscar el estado actual del agente para saber si estaba en_mision (había aceptado)
    const { data: agenteData } = await supabase
      .from('agentes').select('estado_turno, misiones_interrumpidas').eq('id', agente.id).single()

    const estabaEnMision = agenteData?.estado_turno === 'en_mision'

    if (estabaEnMision) {
      // Guardar la misión interrumpida en el agente para que aparezca en su bandeja
      const misionesInterrumpidas = Array.isArray(agenteData?.misiones_interrumpidas)
        ? agenteData.misiones_interrumpidas
        : []
      const nuevaInterrupcion = {
        mision_id: mision.id,
        titulo: mision.titulo,
        tipo: mision.tipo,
        direccion: mision.direccion,
        descripcion: mision.descripcion,
        base: mision.base,
        numero_mision: mision.numero_mision,
        numero_orden_servicio: mision.numero_orden_servicio,
        prioridad: mision.prioridad,
        interrumpida_en: new Date().toISOString(),
        pendiente_registro: true, // el agente aún no respondió
      }
      await supabase.from('agentes').update({
        estado_turno: 'libre',
        misiones_interrumpidas: [...misionesInterrumpidas, nuevaInterrupcion],
      }).eq('id', agente.id)
    } else {
      // Solo liberarlo si no había aceptado todavía
      await supabase.from('agentes').update({ estado_turno: 'libre' }).eq('id', agente.id)
    }

    await actividadAgenteLibrerado({ mision, agente, actor: { ...actor, nombre: `${actor.nombre} ${actor.apellido}` } })
    setDesasignando(null); onRefresh()
  }