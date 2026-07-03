import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import ServiciosPicker from '../../ServiciosPicker/ServiciosPicker'
import { FiArrowRight, FiArrowLeft, FiShoppingCart } from 'react-icons/fi'
import './EventoFlujo.css'

// Paso 3 del flujo: elegir productos de consumo (tienda) en página completa.
const EventoProductosScreen = () => {
    const navigate = useNavigate()
    const {
        reservaOrganizador, serviciosCarrito,
        agregarServicioAdicional, quitarServicioAdicional, actualizarCantidadServicio,
        setIsCartOpen,
    } = useCarrito()

    if (!reservaOrganizador) {
        navigate('/eventos/new')
        return null
    }

    const de = reservaOrganizador.datos_evento || {}
    const fecha = reservaOrganizador.fecha ? String(reservaOrganizador.fecha).slice(0, 10) : null
    const cupo = Number(de.cupo) || 0

    const seleccionados = serviciosCarrito.filter((s) => (s.tipo_item || 'producto') === 'producto')

    const onChange = (nuevaLista) => {
        const idsNuevos = new Set(nuevaLista.map((s) => s.id_servicio))
        const mapaActual = new Map(seleccionados.map((s) => [s.id_servicio, s]))
        for (const s of seleccionados) {
            if (!idsNuevos.has(s.id_servicio)) quitarServicioAdicional(s.id_servicio)
        }
        for (const s of nuevaLista) {
            const actual = mapaActual.get(s.id_servicio)
            if (!actual) {
                agregarServicioAdicional(s)
                if ((s.cantidad || 1) > 1) actualizarCantidadServicio(s.id_servicio, s.cantidad)
            } else if (Number(actual.cantidad) !== Number(s.cantidad)) {
                actualizarCantidadServicio(s.id_servicio, s.cantidad)
            }
        }
    }

    // (La pantalla de Invitados como paso propio se agrega en la próxima fase;
    // por ahora, continuar lleva al pago desde el carrito)
    const irSiguiente = () => setIsCartOpen(true)

    return (
        <div className='flujo-screen'>
            <div className='flujo-header'>
                <span className='flujo-paso-tag'>Paso 3 de 5</span>
                <h1>Productos de consumo</h1>
                <p>Sumá bebidas, snacks y otros productos de tienda para <strong>{de.nombre || 'tu evento'}</strong>. Podés saltear este paso.</p>
            </div>

            <ServiciosPicker
                embebido
                soloTipo='producto'
                fechaEvento={fecha}
                horaEvento={de.hora_inicio || null}
                horaFinEvento={de.hora_fin || null}
                cupo={cupo}
                seleccionados={seleccionados}
                onChange={onChange}
            />

            <div className='flujo-nav'>
                <button className='flujo-btn flujo-btn--ghost' onClick={() => navigate('/organizar/servicios')}>
                    <FiArrowLeft size={16} /> Volver a Servicios
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className='flujo-btn flujo-btn--ghost' onClick={() => setIsCartOpen(true)}>
                        <FiShoppingCart size={16} /> Ir directo al pago
                    </button>
                    <button className='flujo-btn flujo-btn--primary' onClick={irSiguiente}>
                        Continuar al pago <FiArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EventoProductosScreen
