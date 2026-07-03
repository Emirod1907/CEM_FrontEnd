import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import ServiciosPicker from '../../ServiciosPicker/ServiciosPicker'
import { FiArrowRight, FiShoppingCart, FiHome } from 'react-icons/fi'
import './EventoFlujo.css'

// Paso 2 del flujo: elegir servicios adicionales en página completa.
const EventoServiciosScreen = () => {
    const navigate = useNavigate()
    const {
        reservaOrganizador, serviciosCarrito,
        reemplazarServiciosPorTipo,
        serviciosSinGuardar, guardandoServicios, guardarCambiosReserva,
        setIsCartOpen,
    } = useCarrito()

    if (!reservaOrganizador) {
        return (
            <div className='flujo-screen'>
                <div className='flujo-vacio'>
                    <FiHome size={44} />
                    <h2>Todavía no reservaste un salón</h2>
                    <p>Primero elegí un salón y creá tu evento para poder sumar servicios.</p>
                    <button className='flujo-btn flujo-btn--primary' onClick={() => navigate('/eventos/new')}>
                        Ir a crear evento
                    </button>
                </div>
            </div>
        )
    }

    const de = reservaOrganizador.datos_evento || {}
    const fecha = reservaOrganizador.fecha ? String(reservaOrganizador.fecha).slice(0, 10) : null
    const cupo = Number(de.cupo) || 0

    // Solo los servicios (tipo servicio) del carrito son la selección de este paso
    const seleccionados = serviciosCarrito.filter((s) => (s.tipo_item || 'producto') === 'servicio')

    // El picker maneja la lista completa de servicios; la volcamos al carrito.
    const onChange = (nuevaLista) => reemplazarServiciosPorTipo('servicio', nuevaLista)

    return (
        <div className='flujo-screen'>
            <div className='flujo-header'>
                <span className='flujo-paso-tag'>Paso 2 de 5</span>
                <h1>Servicios adicionales</h1>
                <p>Sumá servicios para <strong>{de.nombre || 'tu evento'}</strong> (DJ, catering, seguridad…). Podés saltear este paso.</p>
            </div>

            <ServiciosPicker
                embebido
                soloTipo='servicio'
                fechaEvento={fecha}
                horaEvento={de.hora_inicio || null}
                horaFinEvento={de.hora_fin || null}
                cupo={cupo}
                seleccionados={seleccionados}
                onChange={onChange}
                sinGuardar={serviciosSinGuardar}
                guardando={guardandoServicios}
                onConfirmar={guardarCambiosReserva}
            />

            <div className='flujo-nav'>
                <button className='flujo-btn flujo-btn--ghost' onClick={() => setIsCartOpen(true)}>
                    <FiShoppingCart size={16} /> Ir directo al pago
                </button>
                <button className='flujo-btn flujo-btn--primary' onClick={() => navigate('/organizar/productos')}>
                    Siguiente: Productos <FiArrowRight size={16} />
                </button>
            </div>
        </div>
    )
}

export default EventoServiciosScreen
