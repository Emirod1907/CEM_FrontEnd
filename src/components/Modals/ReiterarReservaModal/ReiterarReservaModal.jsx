import React, { useState, useEffect } from 'react'
import { FiCalendar, FiX, FiRefreshCw, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { getDisponibilidadSalon } from '../../../services/salonesServices'
import { solicitarReserva, eliminarReservaCancelada } from '../../../services/reservaServices'
import './ReiterarReservaModal.css'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const fmtFecha = (fStr) => {
    if (!fStr) return '—'
    const [y, m, d] = fStr.split('-').map(Number)
    const weekday = new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long' })
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${d} ${MESES[m - 1]} ${y}`
}

const ReiterarReservaModal = ({ reserva, onClose, onExito }) => {
    const [cargando,         setCargando]         = useState(true)
    const [alternativas,     setAlternativas]     = useState([])
    const [originalLibre,    setOriginalLibre]    = useState(false)
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
    const [guardando,        setGuardando]        = useState(false)
    const [error,            setError]            = useState(null)

    const fechaOriginal = reserva.fecha?.split('T')[0]
    const salonNombre   = reserva.Salon?.nombre || reserva.bodega_nombre || 'Salón'
    const datosEvento   = typeof reserva.datos_evento === 'string'
        ? JSON.parse(reserva.datos_evento)
        : (reserva.datos_evento || {})

    useEffect(() => {
        const cargar = async () => {
            setCargando(true)
            const ocupadas    = await getDisponibilidadSalon(reserva.bodega_id)
            const ocupadasSet = new Set(ocupadas)
            const hoy         = new Date(); hoy.setHours(0, 0, 0, 0)

            // ¿La fecha original sigue libre?
            const orLibre = Boolean(
                fechaOriginal &&
                !ocupadasSet.has(fechaOriginal) &&
                new Date(fechaOriginal + 'T00:00:00') >= hoy
            )
            setOriginalLibre(orLibre)
            if (orLibre) setFechaSeleccionada(fechaOriginal)

            // Fechas libres cercanas a la fecha original:
            // días previos (pero no antes de hoy) + días posteriores,
            // expandiéndose simétricamente hasta encontrar 8 fechas libres.
            const fechaBase = new Date(fechaOriginal + 'T00:00:00')
            const maxD      = new Date(fechaBase); maxD.setMonth(maxD.getMonth() + 6)
            const alts      = []
            let offset      = 1

            while (alts.length < 8 && offset <= 180) {
                // día posterior a la fecha original
                const posterior = new Date(fechaBase)
                posterior.setDate(posterior.getDate() + offset)
                if (posterior <= maxD) {
                    const fPost = posterior.toISOString().split('T')[0]
                    if (!ocupadasSet.has(fPost)) alts.push(fPost)
                }

                // día previo a la fecha original (solo si es futuro o hoy)
                if (alts.length < 8) {
                    const previo = new Date(fechaBase)
                    previo.setDate(previo.getDate() - offset)
                    if (previo >= hoy) {
                        const fPrev = previo.toISOString().split('T')[0]
                        if (!ocupadasSet.has(fPrev)) alts.push(fPrev)
                    }
                }

                offset++
            }

            // Ordenar cronológicamente
            alts.sort()
            setAlternativas(alts)
            setCargando(false)
        }
        cargar()
    }, [reserva.bodega_id, fechaOriginal])

    const handleConfirmar = async () => {
        if (!fechaSeleccionada || guardando) return
        setGuardando(true)
        setError(null)
        try {
            const nueva = await solicitarReserva({
                bodega_id:    reserva.bodega_id,
                fecha:        fechaSeleccionada,
                datos_evento: { ...datosEvento, fecha: fechaSeleccionada },
            })
            // Eliminar la reserva cancelada del backend para que no vuelva a aparecer
            await eliminarReservaCancelada(reserva.id_reserva)
            onExito({
                ...nueva,
                Salon:            reserva.Salon,
                bodega_nombre:    reserva.Salon?.nombre    || reserva.bodega_nombre    || '',
                bodega_domicilio: reserva.Salon?.domicilio || reserva.bodega_domicilio || '',
                porcentaje_sena:  30,
            })
        } catch (err) {
            setError(err?.response?.data?.message || 'No se pudo crear la reserva. Intentá con otra fecha.')
            setGuardando(false)
        }
    }

    return (
        <div className="rr-overlay" onClick={e => { if (e.target === e.currentTarget && !guardando) onClose() }}>
            <div className="rr-modal">

                {/* Header */}
                <div className="rr-header">
                    <div className="rr-header-titulo">
                        <FiRefreshCw size={17} />
                        <div>
                            <h2>Reiterar reserva</h2>
                            <p className="rr-salon">{salonNombre}</p>
                        </div>
                    </div>
                    <button className="rr-cerrar" onClick={onClose} disabled={guardando}>
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="rr-body">
                    {cargando ? (
                        <div className="rr-loading">
                            <div className="rr-spinner" />
                            <span>Verificando disponibilidad del salón...</span>
                        </div>
                    ) : (
                        <>
                            {/* Fecha original */}
                            <div className="rr-seccion">
                                <p className="rr-label">Fecha original</p>
                                <div className={`rr-fecha-original ${originalLibre ? 'libre' : 'ocupada'}`}>
                                    <FiCalendar size={14} />
                                    <span>{fmtFecha(fechaOriginal)}</span>
                                    <span className={`rr-tag ${originalLibre ? 'tag-libre' : 'tag-ocupada'}`}>
                                        {originalLibre ? 'Disponible' : 'Ocupada'}
                                    </span>
                                </div>
                            </div>

                            {originalLibre ? (
                                <div className="rr-aviso-libre">
                                    <FiCheck size={15} />
                                    <span>
                                        ¡La fecha original está disponible! Podés reservarla nuevamente
                                        con los mismos datos del evento.
                                    </span>
                                </div>
                            ) : (
                                <div className="rr-seccion">
                                    <p className="rr-label">Elegí una fecha alternativa</p>
                                    <p className="rr-sublabel">
                                        Fechas cercanas al {fmtFecha(fechaOriginal)} en <strong>{salonNombre}</strong>
                                    </p>
                                    {alternativas.length === 0 ? (
                                        <p className="rr-sin-fechas">
                                            No hay fechas disponibles en los próximos 6 meses.
                                        </p>
                                    ) : (
                                        <div className="rr-chips">
                                            {alternativas.map(f => (
                                                <button
                                                    key={f}
                                                    type="button"
                                                    className={`rr-chip ${fechaSeleccionada === f ? 'rr-chip-sel' : ''}`}
                                                    onClick={() => setFechaSeleccionada(f)}
                                                >
                                                    {fmtFecha(f)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {datosEvento?.servicios?.length > 0 && (
                                <div className="rr-nota">
                                    <FiAlertCircle size={13} />
                                    <span>
                                        Los {datosEvento.servicios.length} servicio(s) adicional(es)
                                        de la reserva original se mantendrán en tu nueva reserva.
                                    </span>
                                </div>
                            )}

                            {error && (
                                <div className="rr-error">
                                    <FiAlertCircle size={14} /> {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!cargando && (
                    <div className="rr-footer">
                        <button className="rr-btn-sec" onClick={onClose} disabled={guardando}>
                            Cancelar
                        </button>
                        <button
                            className="rr-btn-prim"
                            onClick={handleConfirmar}
                            disabled={!fechaSeleccionada || guardando}
                        >
                            {guardando
                                ? <><div className="rr-spinner-sm" /> Reservando...</>
                                : <><FiRefreshCw size={14} /> Reiterar reserva</>
                            }
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ReiterarReservaModal
