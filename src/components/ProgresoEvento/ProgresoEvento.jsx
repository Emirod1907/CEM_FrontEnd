import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../Contexts/PersonaContextProvider'
import { useCarrito } from '../../Contexts/CarritoContextProvider'
import { FiCheck } from 'react-icons/fi'
import './ProgresoEvento.css'

const PASOS = [
    { n: 1, label: 'Salón' },
    { n: 2, label: 'Servicios' },
    { n: 3, label: 'Productos' },
    { n: 4, label: 'Pago' },
    { n: 5, label: 'Invitaciones' },
]

// Barra de progreso del flujo de organización de un evento.
// Se muestra solo para organizadores mientras están armando el evento.
const ProgresoEvento = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { persona } = useAuth()
    const { reservaOrganizador, serviciosCarrito, setIsCartOpen } = useCarrito()

    const path = location.pathname
    // Solo el organizador (rol activo) ve la barra de progreso del flujo de evento
    const esOrganizador = persona?.rol === 'organizador'

    // La barra solo aparece mientras estás dentro del flujo real de armado del
    // evento: el formulario de crear evento, los pasos de servicios/productos/
    // invitados, o el pago. En cualquier otra pantalla desaparece, aunque haya una
    // reserva parkeada en el carrito.
    // El paso 1 (Salón) es el catálogo de salones (/salones y el detalle /salones/:id),
    // además del form mínimo de reserva (/eventos/new).
    const enCreacion = path.startsWith('/eventos/new') || path === '/salones' || path.startsWith('/salones/')
    const enFlujo = enCreacion || path.startsWith('/organizar') || path.startsWith('/pago')
    // El mapa fullscreen ocuparía toda la pantalla: la barra no debe taparlo
    const enMapaFull = path.startsWith('/salones/mapa')

    if (!esOrganizador || !enFlujo || enMapaFull) return null

    // En el formulario de crear evento se arranca de cero (paso 1), ignorando
    // cualquier reserva previamente parkeada: es un evento nuevo.
    const tieneReserva = !enCreacion && !!reservaOrganizador
    const servicios = enCreacion ? [] : (serviciosCarrito || [])
    const tieneServicios = servicios.some((s) => (s.tipo_item || 'producto') === 'servicio')
    const tieneProductos = servicios.some((s) => (s.tipo_item || 'producto') === 'producto')

    // El evento es privado (invitaciones personalizadas) vs público (cartelera)
    const esPrivado = reservaOrganizador?.datos_evento?.es_publico === false
    // El pago se considera hecho si la reserva ya está señada/confirmada, o si venimos
    // de la pantalla de éxito, o si ya estamos en el paso de invitaciones.
    const pagoHecho =
        ['seña_abonada', 'confirmada'].includes(reservaOrganizador?.estado) ||
        path.startsWith('/pago/exito') ||
        path.startsWith('/organizar/invitados')

    // Un paso está completado cuando su acción ya se hizo
    const completado = {
        1: tieneReserva,
        2: tieneServicios,
        3: tieneProductos,
        4: pagoHecho,
        5: false, // informativo: se resalta al gestionar invitaciones
    }

    // Del paso 2 al 4 hace falta haber reservado un salón. El paso 5 (invitaciones)
    // solo aplica a eventos privados y una vez acreditado el pago.
    const disponible = (n) => {
        if (n === 1) return true
        if (n === 5) return tieneReserva && esPrivado && pagoHecho
        return tieneReserva
    }
    const motivoBloqueo = (n) => {
        if (n === 5 && tieneReserva && !esPrivado) return 'Las invitaciones son solo para eventos privados'
        if (n === 5 && tieneReserva && !pagoHecho) return 'Primero completá el pago'
        return 'Primero reservá un salón'
    }

    // Paso actual a resaltar
    let actual
    if (path.startsWith('/organizar/invitados')) actual = 5
    else if (path.startsWith('/pago/exito')) actual = esPrivado ? 5 : 4
    else if (path.startsWith('/organizar/pago')) actual = 4
    else if (path.startsWith('/pago')) actual = 4
    else if (path.startsWith('/organizar/salon')) actual = 1
    else if (path.startsWith('/organizar/servicios')) actual = 2
    else if (path.startsWith('/organizar/productos')) actual = 3
    else if (!tieneReserva) actual = 1
    else if (path.startsWith('/eventos/new')) actual = 1
    else actual = [2, 3, 4, 5].find((n) => !completado[n] && disponible(n)) || 4

    const irAPaso = (n) => {
        if (!disponible(n)) return
        switch (n) {
            case 1:
                // Con una reserva en curso, el paso 1 es la página del salón elegido
                // (dentro del flujo); sin reserva, la lista de salones para elegir.
                navigate(reservaOrganizador ? '/organizar/salon' : '/salones')
                break
            case 2: navigate('/organizar/servicios'); break
            case 3: navigate('/organizar/productos'); break
            case 4: navigate('/organizar/pago'); break
            case 5: navigate('/organizar/invitados'); break
            default: break
        }
    }

    return (
        <>
        <nav className="prog-evento" aria-label="Progreso del evento">
            <div className="prog-inner">
                {PASOS.map((paso, i) => {
                    const done = completado[paso.n]
                    // "Estás aquí": el paso que corresponde a la pantalla actual (se resalta
                    // aunque el paso ya esté completado, para que se note dónde estás parado)
                    const isAqui = paso.n === actual
                    const isActual = isAqui && !done
                    const disp = disponible(paso.n)
                    const clase = [
                        'prog-paso',
                        done ? 'prog-done' : '',
                        isActual ? 'prog-actual' : '',
                        isAqui ? 'prog-aqui' : '',
                        !disp ? 'prog-disabled' : '',
                    ].join(' ')
                    return (
                        <React.Fragment key={paso.n}>
                            <button
                                className={clase}
                                onClick={() => irAPaso(paso.n)}
                                disabled={!disp}
                                title={!disp ? motivoBloqueo(paso.n) : (isAqui ? `Estás en: ${paso.label}` : paso.label)}
                                aria-current={isAqui ? 'step' : undefined}
                            >
                                <span className="prog-circulo">
                                    {done ? <FiCheck size={12} /> : paso.n}
                                </span>
                                <span className="prog-label">{paso.label}</span>
                            </button>
                            {i < PASOS.length - 1 && (
                                <span className={`prog-linea ${done ? 'prog-linea-done' : ''}`} />
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        </nav>
        {/* Empuja el contenido hacia abajo cuando la barra está visible */}
        <div className="prog-espaciador" aria-hidden="true" />
        </>
    )
}

export default ProgresoEvento
