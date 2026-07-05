import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { getSalones } from '../../../services/salonesServices'
import { cambiarFechaReserva } from '../../../services/reservaServices'
import { calcularPrecioEvento, tipoDia, TIPO_DIA_LABEL, TIPO_DIA_COLOR } from '../../../utils/preciosUtils'
import MapaSalonModal from '../../Modals/MapaSalonModal/MapaSalonModal'
import { FiArrowRight, FiHome, FiMapPin, FiUsers, FiMap, FiArrowLeft, FiCalendar, FiCheck, FiAlertCircle } from 'react-icons/fi'
import '../../Buscadores/BuscarSalonList/BuscarSalonList.css'
import './EventoFlujo.css'

const DIAS_LIMITE_CAMBIO_FECHA = 7

// Duración del evento (horas) a partir de hora_inicio/hora_fin
const horasDeEvento = (de) => {
    const hi = de?.hora_inicio, hf = de?.hora_fin
    if (!hi || !hf) return 1
    const [h1, m1] = String(hi).split(':').map(Number)
    const [h2, m2] = String(hf).split(':').map(Number)
    if ([h1, m1, h2, m2].some(n => Number.isNaN(n))) return 1
    const mins = ((h2 * 60 + m2) - (h1 * 60 + m1) + 1440) % 1440
    return mins > 0 ? Math.max(1, Math.ceil(mins / 60)) : 1
}
const hoyISO = () => new Date().toISOString().slice(0, 10)
const fmtFecha = (f) => f
    ? new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

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
    const { reservaOrganizador, setReservaOrganizador } = useCarrito()

    const [salon, setSalon] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [mapaAbierto, setMapaAbierto] = useState(false)
    const [nuevaFecha, setNuevaFecha] = useState('')
    const [cambiandoFecha, setCambiandoFecha] = useState(false)
    const [fechaMsg, setFechaMsg] = useState(null)
    const [fechaError, setFechaError] = useState(null)

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

    // ── Cambio de fecha (mismo salón) ──────────────────────────────────────────
    const fechaActual = reservaOrganizador.fecha ? String(reservaOrganizador.fecha).slice(0, 10) : null
    const horas = horasDeEvento(de)
    const comisionFactor = 1 + (Number(reservaOrganizador.comision_cliente_porcentaje) || 0) / 100
    const precioBaseSalon = Number(salon?.precio_alquiler) || 0

    // Días hasta el evento actual y si estamos dentro del plazo sin penalidad
    const diasHastaEvento = fechaActual
        ? Math.floor((new Date(fechaActual + 'T00:00:00').getTime() - new Date(hoyISO() + 'T00:00:00').getTime()) / 86400000)
        : 0
    const dentroDePlazo = diasHastaEvento >= DIAS_LIMITE_CAMBIO_FECHA

    // Precio actual y precio de la nueva fecha (según feriado/finde/hábil)
    const precioAlquilerFecha = (fStr) => {
        if (!fStr || !(precioBaseSalon > 0)) return null
        const info = calcularPrecioEvento(precioBaseSalon, salon?.precios_config, fStr, horas)
        return +(info.precio * comisionFactor).toFixed(2)
    }
    const precioActual = precioAlquilerFecha(fechaActual)
    const precioNuevo = nuevaFecha ? precioAlquilerFecha(nuevaFecha) : null
    const tipoNuevo = nuevaFecha ? tipoDia(nuevaFecha) : null
    const diffPrecio = (precioNuevo != null && precioActual != null) ? precioNuevo - precioActual : null

    const handleCambiarFecha = async () => {
        if (!nuevaFecha || cambiandoFecha) return
        setCambiandoFecha(true); setFechaError(null); setFechaMsg(null)
        try {
            const r = await cambiarFechaReserva(reservaOrganizador.id_reserva, nuevaFecha)
            setReservaOrganizador(prev => ({
                ...prev,
                fecha: r.fecha,
                monto_alquiler: r.monto_alquiler,
                monto_sena: r.monto_sena,
                comision_cliente_porcentaje: r.comision_cliente_porcentaje ?? prev.comision_cliente_porcentaje,
                datos_evento: { ...prev.datos_evento, ...(r.datos_evento || {}) },
            }))
            setFechaMsg('¡Fecha actualizada!')
            setNuevaFecha('')
        } catch (e) {
            setFechaError(e?.response?.data?.message || 'No se pudo cambiar la fecha.')
        } finally {
            setCambiandoFecha(false)
        }
    }

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

            {/* ── Cambiar fecha del evento (mismo salón) ── */}
            {!cargando && salon && (
                <div className='salon-fecha-card'>
                    <div className='salon-fecha-head'>
                        <FiCalendar size={16} />
                        <h3>Fecha del evento</h3>
                    </div>
                    <p className='salon-fecha-actual'>
                        Actual: <strong>{fmtFecha(fechaActual)}</strong>
                        {precioActual != null && <span className='salon-fecha-precio'> · Alquiler ${Number(precioActual).toLocaleString('es-AR')}</span>}
                    </p>

                    {!dentroDePlazo ? (
                        <div className='salon-fecha-aviso'>
                            <FiAlertCircle size={14} />
                            El cambio de fecha sin penalidad está disponible hasta <strong>{DIAS_LIMITE_CAMBIO_FECHA} días antes</strong> del evento
                            {diasHastaEvento >= 0 ? ` (faltan ${diasHastaEvento} día${diasHastaEvento === 1 ? '' : 's'})` : ''}.
                        </div>
                    ) : (
                        <>
                            <p className='salon-fecha-hint'>
                                Podés mover el evento a otra fecha en este mismo salón, sin penalidad. El precio se ajusta según sea día hábil, fin de semana o feriado.
                            </p>
                            <div className='salon-fecha-form'>
                                <input
                                    type='date'
                                    className='salon-fecha-input'
                                    value={nuevaFecha}
                                    min={hoyISO()}
                                    onChange={e => { setNuevaFecha(e.target.value); setFechaMsg(null); setFechaError(null) }}
                                />
                                <button
                                    className='flujo-btn flujo-btn--primary'
                                    onClick={handleCambiarFecha}
                                    disabled={!nuevaFecha || cambiandoFecha || nuevaFecha === fechaActual}
                                >
                                    {cambiandoFecha ? 'Cambiando...' : <><FiCheck size={15} /> Cambiar fecha</>}
                                </button>
                            </div>

                            {nuevaFecha && nuevaFecha !== fechaActual && precioNuevo != null && (
                                <div className='salon-fecha-preview'>
                                    <span className='salon-fecha-tipo' style={{ color: TIPO_DIA_COLOR[tipoNuevo] }}>
                                        {TIPO_DIA_LABEL[tipoNuevo]}
                                    </span>
                                    <span>Nuevo alquiler: <strong>${Number(precioNuevo).toLocaleString('es-AR')}</strong></span>
                                    {diffPrecio != null && diffPrecio !== 0 && (
                                        <span className={`salon-fecha-diff ${diffPrecio > 0 ? 'sube' : 'baja'}`}>
                                            {diffPrecio > 0 ? '▲' : '▼'} ${Math.abs(diffPrecio).toLocaleString('es-AR')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {fechaMsg   && <div className='salon-fecha-ok'><FiCheck size={14} /> {fechaMsg}</div>}
                    {fechaError && <div className='salon-fecha-err'><FiAlertCircle size={14} /> {fechaError}</div>}
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
