
// Script para crear 5 items de ejemplo via la API del backend
// Ejecutar desde la consola del browser en localhost:5173

async function crearItems() {
  // Obtener token del sessionStorage
  const token = sessionStorage.getItem('cat_token');
  if (!token) { console.error('No hay token. Logueate primero.'); return; }

  const OS_ID = '4f601149-7990-454d-9c5b-5a481811fb06'; // OS-013
  const BASE_ID = '6677c27b-a0cf-43d9-b17c-f6638d54c5bc'; // Base Central

  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const items = [
    {
      tipo: 'servicio',
      descripcion: 'Control de velocidad Av. Corrientes',
      turno: 'mañana',
      modo_ubicacion: 'altura',
      calle: 'AV CORRIENTES', altura: '1200',
      eje_psv: 'Seguridad vial',
      lat: -34.6037, lng: -58.3816,
      instrucciones: 'Posicionarse en el carril derecho con radar fijo. Coordinar con patrullero.',
      turnos: [{ turno: 'mañana', base_id: BASE_ID, cantidad_agentes: 3 }]
    },
    {
      tipo: 'servicio',
      descripcion: 'Operativo Microcentro - Fiscalización estacionamiento',
      turno: 'tarde',
      modo_ubicacion: 'interseccion',
      calle: 'AV ROQUE SAENZ PEÑA', calle2: 'AV LEANDRO N ALEM',
      eje_psv: 'Estacionamiento y uso del espacio público',
      lat: -34.6017, lng: -58.3726,
      instrucciones: 'Foco en vehículos sobre carril bus y doble fila.',
      turnos: [
        { turno: 'tarde', base_id: BASE_ID, cantidad_agentes: 4 },
        { turno: 'noche', base_id: BASE_ID, cantidad_agentes: 2 }
      ]
    },
    {
      tipo: 'servicio',
      descripcion: 'Regulación tránsito Av. 9 de Julio',
      turno: 'intermedio',
      modo_ubicacion: 'entre_calles',
      calle: 'AV 9 DE JULIO', desde: 'AV CORRIENTES', hasta: 'AV DE MAYO',
      eje_psv: 'Ordenamiento del tránsito',
      lat: -34.6090, lng: -58.3832,
      instrucciones: 'Regulación manual en horario pico. Coordinar con semáforos.',
      turnos: [{ turno: 'intermedio', base_id: BASE_ID, cantidad_agentes: 5 }]
    },
    {
      tipo: 'mision',
      descripcion: 'Reclamo vecinal - Obstrucción de tránsito Palermo',
      turno: 'mañana',
      modo_ubicacion: 'altura',
      calle: 'AV SANTA FE', altura: '3500',
      eje_psv: 'Atención y demandas ciudadanas',
      lat: -34.5890, lng: -58.4140,
      instrucciones: 'Vecinos reportan camión de mudanza bloqueando carril durante horas pico.',
      turnos: [{ turno: 'mañana', base_id: BASE_ID, cantidad_agentes: 2 }]
    },
    {
      tipo: 'servicio',
      descripcion: 'Operativo alcoholemia Fin de Semana',
      turno: 'fsn',
      modo_ubicacion: 'interseccion',
      calle: 'AV DEL LIBERTADOR', calle2: 'TAGLE',
      eje_psv: 'Fiscalización y cumplimiento normativo',
      lat: -34.5733, lng: -58.4114,
      instrucciones: 'Operativo conjunto con Policía de la Ciudad. Alcoholímetro homologado obligatorio.',
      turnos: [{ turno: 'fsn', base_id: BASE_ID, cantidad_agentes: 4 }]
    }
  ];

  for (const item of items) {
    const { turnos, ...payload } = item;
    try {
      // Crear el item
      const r1 = await fetch(`/api/os/${OS_ID}/items`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...payload, cantidad_agentes: {} })
      });
      const saved = await r1.json();
      console.log('✅ Item creado:', saved.descripcion, '| id:', saved.id);

      // Crear turnos
      if (saved.id && turnos) {
        const r2 = await fetch(`/api/os/items/${saved.id}/turnos`, {
          method: 'POST', headers,
          body: JSON.stringify({
            turnos: turnos.map((t, i) => ({ ...t, orden: i })),
            relevos: []
          })
        });
        const t = await r2.json();
        console.log('   Turnos:', t);
      }
    } catch(e) {
      console.error('❌ Error en:', item.descripcion, e);
    }
  }
  console.log('🎉 Listo!');
}

crearItems();
