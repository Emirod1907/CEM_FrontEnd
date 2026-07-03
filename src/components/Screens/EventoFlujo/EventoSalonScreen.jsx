import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { getSalones } from '../../../services/salonesServices'
import MapaSalonModal from '../../Modals/MapaSalonModal/MapaSalonModal'
import { FiArrowRight, FiHome, FiMapPin, FiUsers, FiMap, FiArrowLeft } from 'react-icons/fi'
import '../../Buscadores/BuscarSalonList/BuscarSalonList.css'
import './EventoFlujo.css'

const parsearJSON = (valor) => {
    if (!valor) return []
    if (Array.isArray(valor)) return valor
    try { return JSON.parse(valor) } catch { return [] }
}

// Imagen estática del mapa (mini-preview) centrada en el salón, con el pin
const staticMapUrl = (salon) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!salon?.latitud || !salon?.longitud || !key) return null
    const c = `${salon.latitud},${salon.longitud}`
    return `https://maps.googleapis.com/maps/api/staticmap?center=${c}&zoom=15&size=600x240&scale=2&markers=color:0x770981%7C${c}&key=${key}`
}

// Paso 1 del flujo: detalle del salón elegido en la reserva en curso (página completa,
// dependiente del flujo — NO es un modal ni lleva a la lista de salones).
const EventoSalonScreen = () => {
    const navigate = useNavigate()
    const { reservaOrganizador } = useCarrito()

    const [salon, setSalon] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [mapaAbierto, setMapaAbierto] = useState(false)

    const salonId = reservaOrganizador?.salon_id
        ?? reservaOrganizador?.bodega_id
        ?? reservaOrganizador?.datos_evento?.bodega_id

    useEffect(() => {
        let activo = true
        const cargar = async () => {
            if (!salonId) { setCargando(false); return }
            try {
                const data = await getSalones()
                if (!activo) return
                const encontrado = Array.isArray(data)
                    ? data.find(s => String(s.id_salon ?? s.id_bodega) === String(salonId))
                    : null
                setSalon(encontrado || null)
            } finally {
                if (activo) setCargando(false)
            }
        }
        cargar()
        return () => { activo = false }
    }, [salonId])

    if (!reservaOrganizador) {
        return (
            <div className='flujo-screen'>
                <div className='flujo-vacio'>
                    <FiHome size={44} />
                    <h2>Todavía no reservaste un salón</h2>
                    <p>Primero elegí un salón y creá tu evento.</p>
                    <button className='flujo-btn flujo-btn--primary' onClick={() => navigate('/eventos/new')}>
                        Ir a crear evento
                    </button>
                </div>
            </div>
        )
    }

    const de = reservaOrganizador.datos_evento || {}
    const precio = salon?.precio_publico ?? salon?.precio_alquiler
    const serviciosIncluidos = parsearJSON(salon?.servicios_incluidos)
    const tiposEvento = parsearJSON(salon?.tipos_evento)
    const mapa = staticMapUrl(salon)

    return (
        <div className='flujo-screen'>
            <div className='flujo-header'>
                <span className='flujo-paso-tag'>Paso 1 de 5</span>
                <h1>Salón de tu evento</h1>
                <p>Este es el salón que reservaste para <strong>{de.nombre || 'tu evento'}</strong>.</p>
            </div>

            {cargando ? (
                <p className='flujo-cargando'>Cargando salón...</p>
            ) : !salon ? (
                <div className='flujo-vacio'>
                    <FiHome size={40} />
                    <p>No se pudo cargar el detalle del salón de esta reserva.</p>
                </div>
            ) : (
                <div className='salon-detalle-fs'>
                    {salon.imagen && (
                        <img src={salon.imagen} alt={salon.nombre} className='salon-detalle-fs-img' />
                    )}
                    <h2 className='salon-detalle-fs-nombre'>{salon.nombre}</h2>

                    <div className='salon-detalle-info'>
                        <span><FiMapPin size={14} /> {salon.domicilio}{salon.localidad ? `, ${salon.localidad}` : ''}</span>
                        <span><FiUsers size={14} /> Aforo: {salon.aforo} personas</span>
                        {precio != null && (
                            <span className='salon-detalle-precio'>
                                ${Number(precio).toLocaleString('es-AR')}<small>/evento</small>
                            </span>
                        )}
                    </div>

                    {serviciosIncluidos.length > 0 && (
                        <div className='salon-detalle-seccion'>
                            <h4>Servicios incluidos</h4>
                            <div className='salon-detalle-tags'>
                                {serviciosIncluidos.map((s, i) => (
                                    <span key={i} className='salon-tag salon-tag--servicio'>{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {tiposEvento.length > 0 && (
                        <div className='salon-detalle-seccion'>
                            <h4>Ideal para</h4>
                            <div className='salon-detalle-tags'>
                                {tiposEvento.map((t, i) => (
                                    <span key={i} className='salon-tag salon-tag--tipo'>{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className='salon-detalle-seccion'>
                        <h4>Ubicación</h4>
                        {mapa ? (
                            <button
                                className='salon-detalle-minimapa'
                                onClick={() => setMapaAbierto(true)}
                                title='Ampliar mapa'
                            >
                                <img src={mapa} alt={`Ubicación de ${salon.nombre}`} />
                                <span className='salon-detalle-minimapa-hint'><FiMap size={13} /> Ampliar mapa</span>
                            </button>
                        ) : (
                            <button className='salon-detalle-mapa' onClick={() => setMapaAbierto(true)}>
                                <FiMap size={15} /> Ver ubicación en el mapa
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className='flujo-nav'>
                <button className='flujo-btn flujo-btn--ghost' onClick={() => navigate(-1)}>
                    <FiArrowLeft size={16} /> Volver
                </button>
                <button className='flujo-btn flujo-btn--primary' onClick={() => navigate('/organizar/servicios')}>
                    Siguiente: Servicios <FiArrowRight size={16} />
                </button>
            </div>

            {mapaAbierto && salon && (
                <MapaSalonModal salon={salon} onClose={() => setMapaAbierto(false)} />
            )}
        </div>
    )
}

export default EventoSalonScreen
