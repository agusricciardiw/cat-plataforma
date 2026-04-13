  async function marcarIncumplida() {
    setSaving(true)
    const { data: mision } = await supabase.from('misiones').select('*').eq('id', item.mision_id).single()
    if (mision) {
      const historial = Array.isArray(mision.historial) ? mision.historial : []
      await supabase.from('misiones').update({
        // Vuelve a sin_asignar para que el jefe la vea en su bandeja
        estado: 'sin_asignar',
        agentes_asignados: [],
        iniciada_en: null,
        historial: [...historial, {
          accion: 'interrumpida',
          motivo: 'El agente fue reasignado y no pudo completarla',
          fecha: new Date().toISOString(),
        }],
      }).eq('id', item.mision_id)
    }
    await limpiarInterrupcion()
    setSaving(false); onRefresh()
  }