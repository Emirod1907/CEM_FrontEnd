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
    { n: 4, label: 'Invitados' },
    { n: 5, label: 'Pago' },
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
    const enCreacion = path.startsWith('/eventos/new')
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

    // Un paso está completado cuando su acción ya se hizo
    const completado = {
        1: tieneReserva,
        2: tieneServicios,
        3: tieneProductos,
        4: false, // se marca al gestionar invitaciones (fase a pulir)
        5: false, // se marca al pagar
    }

    // Del paso 2 en adelante hace falta haber reservado un salón
    const disponible = (n) => n === 1 || tieneReserva

    // Paso actual a resaltar
    let actual
    if (path.startsWith('/pago')) actual = 5
    else if (path.startsWith('/organizar/salon')) actual = 1
    else if (path.startsWith('/organizar/servicios')) actual = 2
    else if (path.startsWith('/organizar/productos')) actual = 3
    else if (path.startsWith('/organizar/invitados')) actual = 4
    else if (!tieneReserva) actual = 1
    else if (path.startsWith('/eventos/new')) actual = 1
    else actual = [2, 3, 4, 5].find((n) => !completado[n]) || 5

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
            case 4: navigate('/mis-reservas'); break
            case 5: setIsCartOpen(true); break
            default: break
        }
    }

    return (
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
                                title={!disp ? 'Primero reservá un salón' : (isAqui ? `Estás en: ${paso.label}` : paso.label)}
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
    )
}

export default ProgresoEvento
