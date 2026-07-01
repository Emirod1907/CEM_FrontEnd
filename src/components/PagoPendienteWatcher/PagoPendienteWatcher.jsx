import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { verificarOrden } from '../../services/pagoServices'

const CLAVE = 'cem_orden_pendiente'
const MAX_EDAD_MS = 2 * 60 * 60 * 1000 // descartar órdenes de más de 2 horas
const INTERVALO_MS = 10000

// MP no redirige de vuelta a la app en localhost. Antes de ir al checkout se
// guarda la orden pendiente en localStorage; este watcher (montado en App) la
// verifica al volver el foco a la pestaña y cada unos segundos, y cuando el
// pago se resuelve lleva al usuario a la pantalla de resultado.
const PagoPendienteWatcher = () => {
    const navigate = useNavigate()

    useEffect(() => {
        let activo = true
        let verificando = false

        const verificar = async () => {
            if (verificando) return
            const crudo = localStorage.getItem(CLAVE)
            if (!crudo) return

            let guardado
            try { guardado = JSON.parse(crudo) } catch { localStorage.removeItem(CLAVE); return }
            if (!guardado?.orden_id || Date.now() - (guardado.ts || 0) > MAX_EDAD_MS) {
                localStorage.removeItem(CLAVE)
                return
            }

            // En las pantallas de pago no interferir (ya manejan su resultado)
            if (window.location.pathname.startsWith('/pago/')) return

            verificando = true
            try {
                const data = await verificarOrden(guardado.orden_id)
                if (!activo || !data) return
                if (data.estado === 'aprobado') {
                    localStorage.removeItem(CLAVE)
                    const sufijo = data.mp_payment_id ? `?payment_id=${data.mp_payment_id}` : ''
                    navigate(`/pago/exito${sufijo}`)
                } else if (data.estado === 'rechazado') {
                    localStorage.removeItem(CLAVE)
                    navigate('/pago/fallo')
                }
            } finally {
                verificando = false
            }
        }

        verificar()
        window.addEventListener('focus', verificar)
        const intervalo = setInterval(verificar, INTERVALO_MS)
        return () => {
            activo = false
            window.removeEventListener('focus', verificar)
            clearInterval(intervalo)
        }
    }, [])

    return null
}

export default PagoPendienteWatcher
