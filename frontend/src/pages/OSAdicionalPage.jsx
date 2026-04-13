import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import OSAdicional from '../components/OSAdicional/OSAdicional'

export default function OSAdicionalPage() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()

  // Fechas preseleccionadas desde el modal de nueva OS
  const fechasParam = searchParams.get('fechas')
  const fechasIniciales = fechasParam ? fechasParam.split(',') : []

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <OSAdicional
        osId={id}
        fechasIniciales={fechasIniciales}
        onVolver={() => navigate('/os')}
      />
    </div>
  )
}
