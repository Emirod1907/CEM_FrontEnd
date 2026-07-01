import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { generarLinkPorReserva } from '../../../services/invitacionServices'
import { confirmarPago } from '../../../services/pagoServices'
import { FiCheckCircle, FiXCircle, FiClock, FiHome, FiShoppingCart, FiLink, FiCopy, FiRefreshCw, FiCalendar } from 'react-icons/fi'
import './PagoResultadoScreen.css'

const ESTADOS = {
    exito: {
        icon: <FiCheckCircle size={72} className='resultado-icon exito' />,
        titulo: '¡Pago exitoso!',
        mensaje: 'Tu compra fue procesada correctamente. Recibirás la confirmación en tu correo.',
        clase: 'exito',
    },
    fallo: {
        icon: <FiXCircle size={72} className='resultado-icon fallo' />,
        titulo: 'Pago rechazado',
        mensaje: 'No se pudo procesar tu pago. Verificá los datos de tu tarjeta e intentá de nuevo.',
        clase: 'fallo',
    },
    pendiente: {
        icon: <FiClock size={72} className='resultado-icon pendiente' />,
        titulo: 'Pago pendiente',
        mensaje: 'Tu pago está siendo procesado. Te avisaremos cuando se confirme.',
        clase: 'pendiente',
    },
}

const PagoResultadoScreen = ({ tipo }) => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { vaciarCarrito, reservaOrganizador, vaciarCarritoOrganizador } = useCarrito()
    const { persona } = useAuth()

    // MP agrega payment_id (o collection_id) a la back_url al volver del checkout
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')

    // Link de invitación para eventos privados
    const [linkInvitacion, setLinkInvitacion] = useState('')
    const [generandoLink, setGenerandoLink] = useState(false)
    const [errorLink, setErrorLink] = useState('')
    const [copiado, setCopiado] = useState(false)

    const esOrganizador = !!reservaOrganizador
    const esPrivado = reservaOrganizador?.datos_evento?.es_publico === false
    const reservaId = reservaOrganizador?.id_reserva

    useEffect(() => {
        // Limpiar la orden pendiente guardada: el pago ya tuvo resolución
        // (evita que PagoPendienteWatcher redirija de nuevo más tarde)
        if (tipo === 'exito' || tipo === 'fallo') {
            localStorage.removeItem('cem_orden_pendiente')
        }
        if (tipo === 'exito') {
            vaciarCarrito()
            procesarPagoExitoso()
        }
    }, [tipo])

    // Confirma el pago contra MP (respaldo del webhook, que no llega en localhost)
    // y recién después genera el link de invitación si el evento es privado.
    const procesarPagoExitoso = async () => {
        if (paymentId) await confirmarPago(paymentId)
        if (esPrivado && reservaId) intentarGenerarLink()
    }

    const intentarGenerarLink = async () => {
        setGenerandoLink(true)
        setErrorLink('')
        try {
            const data = await generarLinkPorReserva(reservaId)
            if (data.procesando) {
                setErrorLink('El evento aún está siendo procesado. Hacé clic en "Generar link" en unos segundos.')
            } else {
                setLinkInvitacion(data.link)
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'No se pudo generar el link aún.'
            setErrorLink(msg)
        } finally {
            setGenerandoLink(false)
        }
    }

    const copiarLink = async () => {
        try {
            await navigator.clipboard.writeText(linkInvitacion)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2500)
        } catch {
            prompt('Copiá el link:', linkInvitacion)
        }
    }

    const handleTerminar = () => {
        if (tipo === 'exito') vaciarCarritoOrganizador()
        navigate('/')
    }

    const handleMisReservas = () => {
        if (tipo === 'exito') vaciarCarritoOrganizador()
        navigate('/mis-reservas')
    }

    // Tras una recarga completa el carrito puede haberse perdido — el rol
    // de organizador sirve como señal para ofrecer volver a sus reservas
    const mostrarMisReservas = esOrganizador || persona?.rol === 'organizador'

    const estado = ESTADOS[tipo] || ESTADOS['fallo']

    return (
        <div className='resultado-container'>
            <div className={`resultado-card ${estado.clase}`}>
                {estado.icon}
                <h1 className='resultado-titulo'>{estado.titulo}</h1>
                <p className='resultado-mensaje'>{estado.mensaje}</p>

                {paymentId && (
                    <div className='resultado-detalle'>
                        <span>ID de pago:</span>
                        <strong>{paymentId}</strong>
                    </div>
                )}

                {/* Sección link de invitación — solo para eventos privados exitosos */}
                {tipo === 'exito' && esOrganizador && esPrivado && (
                    <div className='resultado-invitacion'>
                        <div className='resultado-invitacion-titulo'>
                            <FiLink size={18} />
                            <h3>Link de invitación</h3>
                        </div>
                        <p className='resultado-invitacion-desc'>
                            Tu evento es <strong>privado</strong>. Compartí este link para que tus invitados confirmen asistencia y reciban su entrada con QR.
                        </p>

                        {linkInvitacion ? (
                            <div className='resultado-link-box'>
                                <span className='resultado-link-texto'>{linkInvitacion}</span>
                                <button className='resultado-btn-copiar' onClick={copiarLink}>
                                    <FiCopy size={15} />
                                    {copiado ? '¡Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        ) : (
                            <div className='resultado-link-acciones'>
                                {errorLink && (
                                    <p className='resultado-link-error'>{errorLink}</p>
                                )}
                                <button
                                    className='resultado-btn-generar'
                                    onClick={intentarGenerarLink}
                                    disabled={generandoLink}
                                >
                                    {generandoLink
                                        ? <><span className='resultado-spinner' /> Generando...</>
                                        : <><FiRefreshCw size={15} /> {errorLink ? 'Reintentar' : 'Generar link'}</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className='resultado-acciones'>
                    {mostrarMisReservas && (
                        <button
                            className='btn-resultado btn-home'
                            onClick={handleMisReservas}
                        >
                            <FiCalendar size={18} />
                            Ver mis reservas
                        </button>
                    )}
                    <button
                        className={`btn-resultado ${mostrarMisReservas ? 'btn-eventos' : 'btn-home'}`}
                        onClick={handleTerminar}
                    >
                        <FiHome size={18} />
                        Ir al inicio
                    </button>
                    {!mostrarMisReservas && (
                        <button
                            className='btn-resultado btn-eventos'
                            onClick={() => navigate('/eventos')}
                        >
                            <FiShoppingCart size={18} />
                            Ver más eventos
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PagoResultadoScreen
