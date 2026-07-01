import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { verificarOrden } from '../../../services/pagoServices'
import { FiClock, FiRefreshCw, FiXCircle, FiExternalLink } from 'react-icons/fi'
import './PagoEsperaScreen.css'

// Pantalla de espera mientras el usuario paga en la pestaña de MercadoPago.
// En localhost MP no redirige de vuelta, así que consultamos el estado de la
// orden cada unos segundos hasta que el pago se acredite o sea rechazado.
const INTERVALO_MS = 5000

const PagoEsperaScreen = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const ordenId = searchParams.get('orden_id')

    const [verificando, setVerificando] = useState(false)
    const verificandoRef = useRef(false)

    const verificar = async () => {
        if (!ordenId || verificandoRef.current) return
        verificandoRef.current = true
        setVerificando(true)
        try {
            const data = await verificarOrden(ordenId)
            if (data?.estado === 'aprobado') {
                const sufijo = data.mp_payment_id ? `?payment_id=${data.mp_payment_id}` : ''
                navigate(`/pago/exito${sufijo}`)
            } else if (data?.estado === 'rechazado') {
                navigate('/pago/fallo')
            }
        } finally {
            verificandoRef.current = false
            setVerificando(false)
        }
    }

    useEffect(() => {
        if (!ordenId) {
            navigate('/')
            return
        }
        verificar()
        const intervalo = setInterval(verificar, INTERVALO_MS)
        return () => clearInterval(intervalo)
    }, [ordenId])

    return (
        <div className='espera-container'>
            <div className='espera-card'>
                <div className='espera-icono'>
                    <FiClock size={56} />
                    <span className='espera-spinner' />
                </div>
                <h1 className='espera-titulo'>Esperando tu pago</h1>
                <p className='espera-mensaje'>
                    Completá el pago en la pestaña de <strong>MercadoPago</strong> que se abrió.
                    Cuando se acredite, esta pantalla se actualizará sola.
                </p>
                <p className='espera-nota'>
                    <FiExternalLink size={14} />
                    ¿Se cerró la pestaña? Podés verificar manualmente con el botón de abajo.
                </p>

                <div className='espera-acciones'>
                    <button
                        className='espera-btn espera-btn-verificar'
                        onClick={verificar}
                        disabled={verificando}
                    >
                        <FiRefreshCw size={16} className={verificando ? 'espera-girando' : ''} />
                        {verificando ? 'Verificando...' : 'Ya pagué, verificar ahora'}
                    </button>
                    <button
                        className='espera-btn espera-btn-cancelar'
                        onClick={() => navigate('/')}
                    >
                        <FiXCircle size={16} />
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PagoEsperaScreen
