import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { getReservaDetalle } from '../../../services/reservaServices'
import { InvitacionesPanel } from '../../Modals/InvitacionesModal/InvitacionesModal'
import { FiHome, FiCheck, FiGlobe, FiClock, FiRefreshCw } from 'react-icons/fi'
import './EventoFlujo.css'

// Paso 5 del flujo: enviar invitaciones (solo eventos privados, luego del pago).
const EventoInvitadosScreen = () => {
    const navigate = useNavigate()
    const { reservaOrganizador, vaciarCarritoOrganizador } = useCarrito()

    const [reserva, setReserva]   = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError]       = useState(null)

    const idReserva = reservaOrganizador?.id_reserva

    const cargar = () => {
        if (!idReserva) { setCargando(false); return }
        setCargando(true); setError(null)
        getReservaDetalle(idReserva)
            .then((data) => setReserva(data?.reserva || null))
            .catch(() => setError('No se pudo cargar la reserva.'))
            .finally(() => setCargando(false))
    }

    useEffect(() => { cargar() }, [idReserva])

    // Sin reserva en curso: no hay a qué evento invitar
    if (!idReserva) {
        return (
            <div className='flujo-screen'>
                <div className='flujo-vacio'>
                    <FiHome size={44} />
                    <h2>No hay una reserva en curso</h2>
                    <p>Para enviar invitaciones primero tenés que reservar un salón, pagar y tener un evento privado.</p>
                    <button className='flujo-btn flujo-btn--primary' onClick={() => navigate('/mis-reservas')}>
                        Ir a mis reservas
                    </button>
                </div>
            </div>
        )
    }

    if (cargando) {
        return (
            <div className='flujo-screen'>
                <div className='flujo-vacio'><FiClock size={40} /><p>Cargando…</p></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className='flujo-screen'>
                <div className='flujo-vacio'>
                    <p>{error}</p>
                    <button className='flujo-btn flujo-btn--ghost' onClick={cargar}>
                        <FiRefreshCw size={15} /> Reintentar
                    </button>
                </div>
            </div>
        )
    }

    const de        = reserva?.datos_evento || {}
    const esPrivado = de?.es_publico === false
    const pagado    = ['seña_abonada', 'confirmada'].includes(reserva?.estado)

    // Evento público: no aplica invitación personalizada
    if (!esPrivado) {
        return (
            <div className='flujo-screen'>
                <div className='flujo-header'>
                    <span className='flujo-paso-tag'>Paso 5 de 5</span>
                    <h1>Invitaciones</h1>
                </div>
                <div className='flujo-vacio'>
                    <FiGlobe size={44} />
                    <h2>Tu evento es público</h2>
                    <p>Los eventos públicos se listan en la cartelera y cualquiera puede comprar su entrada.
                       Las invitaciones personalizadas por WhatsApp son solo para eventos privados.</p>
                    <button className='flujo-btn flujo-btn--primary' onClick={() => { vaciarCarritoOrganizador(); navigate('/eventos') }}>
                        <FiCheck size={16} /> Finalizar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className='flujo-screen'>
            <div className='flujo-header'>
                <span className='flujo-paso-tag'>Paso 5 de 5</span>
                <h1>Invitaciones</h1>
                <p>Enviá invitaciones personalizadas por WhatsApp para <strong>{de?.nombre || 'tu evento'}</strong>.
                   Cada invitado recibe un link único para confirmar asistencia y recibir su entrada con QR.</p>
            </div>

            <InvitacionesPanel
                eventoId={pagado ? reserva.evento_id : null}
                eventoNombre={reserva?.Evento?.nombre || de?.nombre || 'Evento'}
                eventoImagen={de?.imagen || reserva?.Evento?.imagen || null}
                eventoPrecio={de?.precio || reserva?.Evento?.precio || null}
                eventoFecha={reserva?.fecha}
                eventoCupo={de?.cupo || reserva?.Evento?.cupo || null}
            />

            <div className='flujo-nav'>
                <button className='flujo-btn flujo-btn--ghost' onClick={() => navigate('/mis-reservas')}>
                    Ver mis reservas
                </button>
                <button className='flujo-btn flujo-btn--primary' onClick={() => { vaciarCarritoOrganizador(); navigate('/') }}>
                    <FiCheck size={16} /> Finalizar
                </button>
            </div>
        </div>
    )
}

export default EventoInvitadosScreen
