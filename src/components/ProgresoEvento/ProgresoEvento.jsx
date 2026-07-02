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

    // Rutas del flujo (excluye el mapa fullscreen, que ocuparía toda la pantalla)
    const enSalones = path.startsWith('/salones') && !path.startsWith('/salones/mapa')
    const enRutaFlujo = enSalones || path.startsWith('/eventos/new') || path.startsWith('/mis-reservas') || path.startsWith('/pago')
    const enFlujo = enRutaFlujo || !!reservaOrganizador

    if (!esOrganizador || !enFlujo) return null

    const tieneReserva = !!reservaOrganizador
    const servicios = serviciosCarrito || []
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
    else if (!tieneReserva) actual = 1
    else if (path.startsWith('/eventos/new')) actual = 1
    else actual = [2, 3, 4, 5].find((n) => !completado[n]) || 5

    const irAPaso = (n) => {
        if (!disponible(n)) return
        switch (n) {
            case 1: navigate('/salones'); break
            case 2: // servicios y productos se agregan desde el carrito
            case 3: setIsCartOpen(true); break
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
                    const isActual = paso.n === actual && !done
                    const disp = disponible(paso.n)
                    const clase = [
                        'prog-paso',
                        done ? 'prog-done' : '',
                        isActual ? 'prog-actual' : '',
                        !disp ? 'prog-disabled' : '',
                    ].join(' ')
                    return (
                        <React.Fragment key={paso.n}>
                            <button
                                className={clase}
                                onClick={() => irAPaso(paso.n)}
                                disabled={!disp}
                                title={!disp ? 'Primero reservá un salón' : paso.label}
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
