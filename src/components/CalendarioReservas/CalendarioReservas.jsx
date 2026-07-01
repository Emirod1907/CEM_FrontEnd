import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { FiCalendar, FiMapPin, FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle, FiEye, FiShoppingCart, FiX, FiRefreshCw, FiPlusCircle, FiBookmark } from 'react-icons/fi'
import ReiterarReservaModal from '../Modals/ReiterarReservaModal/ReiterarReservaModal'
import './CalendarioReservas.css'

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIAS_MINI   = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const ESTADO_CONFIG = {
    pendiente_pago: { label: 'Pendiente de pago', clase: 'estado-pendiente' },
    seña_abonada:   { label: 'Seña abonada',      clase: 'estado-sena'      },
    confirmada:     { label: 'Confirmada',         clase: 'estado-confirmada'},
    cancelada:      { label: 'Cancelada',          clase: 'estado-cancelada' },
}

// ── Countdown ────────────────────────────────────────────────────────────────
const calcularTiempo = (fecha_limite_pago) => {
    if (!fecha_limite_pago) return null
    const diff = new Date(fecha_limite_pago) - Date.now()
    if (diff <= 0) return { horas: 0, minutos: 0, segundos: 0, vencida: true }
    return {
        horas:    Math.floor(diff / 3_600_000),
        minutos:  Math.floor((diff % 3_600_000) / 60_000),
        segundos: Math.floor((diff % 60_000) / 1_000),
        vencida:  false,
    }
}

const Countdown = ({ fecha_limite_pago, onVencida }) => {
    const [tiempo, setTiempo] = useState(() => calcularTiempo(fecha_limite_pago))

    React.useEffect(() => {
        const id = setInterval(() => {
            const t = calcularTiempo(fecha_limite_pago)
            setTiempo(t)
            if (t?.vencida) { clearInterval(id); onVencida?.() }
        }, 1_000)
        return () => clearInterval(id)
    }, [fecha_limite_pago, onVencida])

    if (!tiempo) return null
    const pad = n => String(n).padStart(2, '0')
    if (tiempo.vencida) return (
        <div className="cr-countdown vencida"><FiAlertCircle size={13} /> Plazo vencido</div>
    )
    return (
        <div className={`cr-countdown ${tiempo.horas < 6 ? 'urgente' : ''}`}>
            <FiClock size={13} />
            <span>{pad(tiempo.horas)}h {pad(tiempo.minutos)}m {pad(tiempo.segundos)}s</span>
        </div>
    )
}

// ── MiniMes (tarjeta del año) ────────────────────────────────────────────────
const MiniMes = ({ anio, mes, fechasConReserva, onClick }) => {
    const primerDia  = new Date(anio, mes, 1).getDay()
    const diasEnMes  = new Date(anio, mes + 1, 0).getDate()
    const hoy        = new Date(); hoy.setHours(0, 0, 0, 0)

    const cantReservas = Array.from(fechasConReserva).filter(f => {
        const [y, m] = f.split('-').map(Number)
        return y === anio && m === mes + 1
    }).length

    const celdas = []
    for (let i = 0; i < primerDia; i++) {
        celdas.push(<div key={`v${i}`} className="mm-cel mm-vacio" />)
    }
    for (let d = 1; d <= diasEnMes; d++) {
        const fStr    = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const tieneRes = fechasConReserva.has(fStr)
        const esHoy    = new Date(anio, mes, d).getTime() === hoy.getTime()
        celdas.push(
            <div key={d} className={`mm-cel ${tieneRes ? 'mm-reservada' : ''} ${esHoy ? 'mm-hoy' : ''}`} />
        )
    }

    return (
        <button
            type="button"
            className={`mm-card ${cantReservas > 0 ? 'mm-con-reservas' : ''}`}
            onClick={() => onClick(mes)}
            aria-label={`Ver ${MESES[mes]} ${anio}`}
        >
            <div className="mm-header">
                <span className="mm-nombre">{MESES[mes]}</span>
                {cantReservas > 0 && <span className="mm-badge">{cantReservas}</span>}
            </div>
            <div className="mm-dias-semana">
                {DIAS_MINI.map(d => <div key={d} className="mm-dia-nombre">{d}</div>)}
            </div>
            <div className="mm-grid">{celdas}</div>
        </button>
    )
}

// ── CalendarioReservas (componente principal) ────────────────────────────────
const CalendarioReservas = ({
    reservas = [],
    onVerDetalle,
    onPagarSena,
    onCancelar,
    cancelando,
    reservaEnCarrito,
    onVerCarrito,
    onVencida,
    onReiterarExito,
}) => {
    const hoy = new Date()
    const navigate = useNavigate()
    const tooltipRef = useRef(null)

    const [anio,          setAnio]          = useState(hoy.getFullYear())
    const [mesZoom,       setMesZoom]       = useState(null)
    const [vistaKey,      setVistaKey]      = useState(0)
    const [zoomOrigin,    setZoomOrigin]    = useState('center center')
    const [filtroEstado,    setFiltroEstado]    = useState('')
    const [mostrarArchivo,  setMostrarArchivo]  = useState(false)
    const [reservaAReiterar, setReservaAReiterar] = useState(null)
    // Tooltip de "Reservar fecha libre"
    const [tooltipFecha,  setTooltipFecha]  = useState(null)   // 'YYYY-MM-DD' | null

    // Cerrar tooltip al hacer click fuera
    useEffect(() => {
        if (!tooltipFecha) return
        const handler = (e) => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
                setTooltipFecha(null)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [tooltipFecha])

    const handleReservarFecha = (fecha) => {
        setTooltipFecha(null)
        navigate('/eventos/new', { state: { fecha } })
    }

    // Fechas con reservas ACTIVAS (sin canceladas) — para el calendario
    const fechasConReserva = new Set(
        reservas
            .filter(r => r.estado !== 'cancelada')
            .map(r => r.fecha?.split('T')[0])
            .filter(Boolean)
    )

    // Reservas activas del período (sin canceladas)
    const reservasActivas = reservas.filter(r => {
        if (!r.fecha || r.estado === 'cancelada') return false
        const [y, m] = r.fecha.split('T')[0].split('-').map(Number)
        if (y !== anio) return false
        if (mesZoom !== null && m !== mesZoom + 1) return false
        return true
    })

    // Reservas canceladas (archivo — todas, no filtradas por año/mes)
    const reservasArchivadas = reservas
        .filter(r => r.estado === 'cancelada')
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    // Aplicar filtro de estado sobre activas
    const reservasFiltradas = (filtroEstado
        ? reservasActivas.filter(r => r.estado === filtroEstado)
        : reservasActivas
    ).sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

    const calcOrigin = (mes) => {
        const col  = mes % 4
        const row  = Math.floor(mes / 4)
        const xPct = [12.5, 37.5, 62.5, 87.5][col]
        const yPct = [16.7, 50,   83.3][row]
        return `${xPct}% ${yPct}%`
    }

    const handleClickMes = (mes) => {
        setZoomOrigin(calcOrigin(mes))
        setMesZoom(mes)
        setVistaKey(k => k + 1)
    }

    const handleVolverAnual = () => {
        setMesZoom(null)
        setVistaKey(k => k + 1)
    }

    // Celdas del mes completo (usa fechasConReserva que ya excluye canceladas)
    const renderMesCompleto = () => {
        const primerDia = new Date(anio, mesZoom, 1).getDay()
        const diasEnMes = new Date(anio, mesZoom + 1, 0).getDate()
        const hoyD = new Date(); hoyD.setHours(0, 0, 0, 0)

        const celdas = []
        for (let i = 0; i < primerDia; i++) {
            celdas.push(<div key={`v${i}`} className="cf-dia cf-vacio" />)
        }
        for (let d = 1; d <= diasEnMes; d++) {
            const fStr     = `${anio}-${String(mesZoom + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const tieneRes = fechasConReserva.has(fStr)
            const esPasada = new Date(anio, mesZoom, d) < hoyD
            const esHoy    = new Date(anio, mesZoom, d).getTime() === hoyD.getTime()
            const nRes     = reservas.filter(r => r.estado !== 'cancelada' && r.fecha?.startsWith(fStr)).length
            const esLibre  = !tieneRes && !esPasada

            let cls = 'cf-dia'
            if (tieneRes)      cls += ' cf-con-reserva'
            else if (esPasada) cls += ' cf-pasada'
            else               cls += ' cf-libre'
            if (esHoy)         cls += ' cf-hoy'

            const esTooltipActivo = tooltipFecha === fStr

            celdas.push(
                <div
                    key={fStr}
                    className={cls}
                    title={tieneRes ? `${nRes} reserva(s)` : esLibre ? 'Click para reservar esta fecha' : ''}
                    onClick={esLibre ? () => setTooltipFecha(esTooltipActivo ? null : fStr) : undefined}
                    style={esLibre ? { cursor: 'pointer' } : undefined}
                >
                    <span className="cf-num">{d}</span>
                    {tieneRes && <span className="cf-punto" />}

                    {/* Tooltip de reserva */}
                    {esTooltipActivo && (
                        <div ref={tooltipRef} className="cf-tooltip" onClick={e => e.stopPropagation()}>
                            <p className="cf-tooltip-fecha">
                                {new Date(fStr + 'T00:00:00').toLocaleDateString('es-AR', {
                                    weekday: 'short', day: '2-digit', month: 'short'
                                })}
                            </p>
                            <button
                                className="cf-tooltip-btn"
                                onClick={() => handleReservarFecha(fStr)}
                            >
                                <FiPlusCircle size={13} /> Reservar esta fecha
                            </button>
                        </div>
                    )}
                </div>
            )
        }
        return celdas
    }

    return (
        <div className="cr-wrapper">

            {/* ── Panel izquierdo: lista ── */}
            <aside className="cr-panel">
                <div className="cr-panel-titulo">
                    <FiCalendar size={16} />
                    <span>
                        {mesZoom !== null
                            ? `${MESES[mesZoom]} ${anio}`
                            : `Reservas ${anio}`}
                    </span>
                    <span className="cr-total">{reservasActivas.length}</span>
                </div>

                {/* Filtros */}
                <div className="cr-filtros">
                    <select
                        className="cr-select"
                        value={filtroEstado}
                        onChange={e => setFiltroEstado(e.target.value)}
                    >
                        <option value="">Todos los estados</option>
                        <option value="pendiente_pago">Pendiente de pago</option>
                        <option value="seña_abonada">Seña abonada</option>
                        <option value="confirmada">Confirmada</option>
                    </select>
                    <button className="cr-btn-archivo" onClick={() => setMostrarArchivo(true)}>
                        Archivo
                        {reservasArchivadas.length > 0 && (
                            <span className="cr-archivo-badge">{reservasArchivadas.length}</span>
                        )}
                    </button>
                </div>

                {filtroEstado && (
                    <div className="cr-filtro-activo">
                        Mostrando {reservasFiltradas.length} de {reservasActivas.length}
                    </div>
                )}

                <div className="cr-lista">
                    {reservasFiltradas.length === 0 ? (
                        <div className="cr-vacio">
                            <FiCalendar size={32} />
                            <p>{filtroEstado ? 'Sin reservas con ese estado.' : 'Sin reservas activas en este período.'}</p>
                        </div>
                    ) : (
                        reservasFiltradas.map(reserva => {
                            const cfg         = ESTADO_CONFIG[reserva.estado] || ESTADO_CONFIG.cancelada
                            const nombre      = reserva.datos_evento?.nombre || 'Evento sin nombre'
                            const fechaEvento = reserva.fecha
                                ? new Date(reserva.fecha).toLocaleDateString('es-AR', {
                                    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
                                  })
                                : '—'
                            const esPendiente = reserva.estado === 'pendiente_pago'
                            const yaEnCarrito = reservaEnCarrito === reserva.id_reserva

                            return (
                                <div key={reserva.id_reserva} className={`cr-item ${reserva.estado}`}>
                                    <div className="cr-item-top">
                                        <span className="cr-nombre">{nombre}</span>
                                        <span className={`cr-badge ${cfg.clase}`}>{cfg.label}</span>
                                    </div>

                                    <div className="cr-item-info">
                                        <div className="cr-info-row">
                                            <FiCalendar size={11} /> {fechaEvento}
                                        </div>
                                        <div className="cr-info-row">
                                            <FiMapPin size={11} /> {reserva.Salon?.nombre || '—'}
                                        </div>
                                        <div className="cr-info-row">
                                            <FiDollarSign size={11} />
                                            {(() => {
                                                const factor = 1 + (Number(reserva.comision_cliente_porcentaje) || 0) / 100
                                                const montoConComision = +(Number(reserva.monto_alquiler) * factor).toFixed(2)
                                                const senaConComision  = +(montoConComision * 0.30).toFixed(2)
                                                return (
                                                    <>
                                                        ${montoConComision.toLocaleString('es-AR')}
                                                        <span className="cr-sena">
                                                            &nbsp;· Seña: ${senaConComision.toLocaleString('es-AR')}
                                                        </span>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    </div>

                                    {esPendiente && reserva.fecha_limite_pago && (
                                        <Countdown
                                            fecha_limite_pago={reserva.fecha_limite_pago}
                                            onVencida={onVencida}
                                        />
                                    )}

                                    <div className="cr-item-acciones">
                                        <button
                                            className="cr-btn cr-btn-detalle"
                                            onClick={() => onVerDetalle(reserva.id_reserva)}
                                        >
                                            <FiEye size={12} /> Ver detalle
                                        </button>

                                        {esPendiente && (
                                            yaEnCarrito ? (
                                                <button className="cr-btn cr-btn-carrito" onClick={onVerCarrito}>
                                                    <FiShoppingCart size={12} /> En carrito
                                                </button>
                                            ) : (
                                                <button
                                                    className="cr-btn cr-btn-pagar"
                                                    onClick={() => onPagarSena(reserva)}
                                                >
                                                    <FiDollarSign size={12} /> Pagar seña
                                                </button>
                                            )
                                        )}

                                        {esPendiente && yaEnCarrito && (
                                            <button
                                                className="cr-btn cr-btn-guardar"
                                                onClick={() => {
                                                    onVerCarrito()
                                                    setTimeout(() => {
                                                        document.getElementById('carrito-precio-entrada')
                                                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                    }, 250)
                                                }}
                                            >
                                                <FiBookmark size={12} /> Guardar reserva
                                            </button>
                                        )}

                                        {esPendiente && (
                                            <button
                                                className="cr-btn cr-btn-cancelar"
                                                onClick={() => onCancelar(reserva.id_reserva)}
                                                disabled={cancelando === reserva.id_reserva}
                                            >
                                                {cancelando === reserva.id_reserva ? '...' : 'Cancelar'}
                                            </button>
                                        )}

                                        {reserva.estado === 'seña_abonada' && (
                                            <div className="cr-aviso-sena">
                                                <FiCheckCircle size={11} /> Seña abonada
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </aside>

            {/* ── Panel derecho: calendario ── */}
            <main className="cr-calendario">
                <div className="cr-cal-header">
                    {mesZoom !== null ? (
                        <button className="cr-volver" type="button" onClick={handleVolverAnual}>
                            <FaChevronLeft size={12} /> Todos los meses
                        </button>
                    ) : (
                        <span className="cr-cal-hint">Toca un mes para verlo en detalle</span>
                    )}

                    <div className="cr-anio-nav">
                        <button type="button" className="cr-nav-btn" onClick={() => setAnio(a => a - 1)}>
                            <FaChevronLeft />
                        </button>
                        <span className="cr-anio">{anio}</span>
                        <button type="button" className="cr-nav-btn" onClick={() => setAnio(a => a + 1)}>
                            <FaChevronRight />
                        </button>
                    </div>
                </div>

                {/* Vista anual */}
                {mesZoom === null && (
                    <div key={`anual-${vistaKey}-${anio}`} className="cr-vista-anual">
                        {MESES.map((_, i) => (
                            <MiniMes
                                key={i}
                                anio={anio}
                                mes={i}
                                fechasConReserva={fechasConReserva}
                                onClick={handleClickMes}
                            />
                        ))}
                    </div>
                )}

                {/* Vista mensual con zoom */}
                {mesZoom !== null && (
                    <div
                        key={`mes-${vistaKey}`}
                        className="cr-vista-mes"
                        style={{ '--zoom-origin': zoomOrigin }}
                    >
                        <h2 className="cr-mes-titulo">{MESES[mesZoom]} {anio}</h2>

                        <div className="cr-full-semana">
                            {DIAS_SEMANA.map(d => (
                                <div key={d} className="cr-full-dia-nombre">{d}</div>
                            ))}
                        </div>

                        <div className="cr-full-grid">
                            {renderMesCompleto()}
                        </div>

                        <div className="cr-leyenda">
                            <span className="cr-leg"><span className="cr-leg-dot reservada" /> Con reserva</span>
                            <span className="cr-leg"><span className="cr-leg-dot libre" /> Libre</span>
                            <span className="cr-leg"><span className="cr-leg-dot pasada" /> Pasado</span>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Modal: archivo de canceladas ── */}
            {reservaAReiterar && (
                <ReiterarReservaModal
                    reserva={reservaAReiterar}
                    onClose={() => setReservaAReiterar(null)}
                    onExito={(nuevaReserva) => {
                        const viejoId = reservaAReiterar.id_reserva
                        setReservaAReiterar(null)
                        onReiterarExito?.(nuevaReserva, viejoId)
                    }}
                />
            )}

            {mostrarArchivo && (
                <div className="cr-overlay" onClick={() => setMostrarArchivo(false)}>
                    <div className="cr-modal" onClick={e => e.stopPropagation()}>
                        <div className="cr-modal-header">
                            <div>
                                <h2>Archivo de reservas canceladas</h2>
                                <span className="cr-modal-sub">
                                    {reservasArchivadas.length} reserva(s) · las fechas quedan liberadas
                                </span>
                            </div>
                            <button className="cr-modal-cerrar" onClick={() => setMostrarArchivo(false)}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="cr-modal-lista">
                            {reservasArchivadas.length === 0 ? (
                                <p className="cr-vacio-texto">No hay reservas canceladas.</p>
                            ) : reservasArchivadas.map(reserva => {
                                const nombre      = reserva.datos_evento?.nombre || 'Evento sin nombre'
                                const fechaEvento = reserva.fecha
                                    ? new Date(reserva.fecha).toLocaleDateString('es-AR', {
                                        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
                                      })
                                    : '—'
                                return (
                                    <div key={reserva.id_reserva} className="cr-archivo-item">
                                        <div className="cr-archivo-info">
                                            <span className="cr-archivo-nombre">{nombre}</span>
                                            <div className="cr-info-row">
                                                <FiCalendar size={11} /> {fechaEvento}
                                            </div>
                                            <div className="cr-info-row">
                                                <FiMapPin size={11} /> {reserva.Salon?.nombre || '—'}
                                            </div>
                                        </div>
                                        <div className="cr-archivo-acciones">
                                            <span className="cr-badge estado-cancelada">Cancelada</span>
                                            <button
                                                className="cr-btn cr-btn-detalle"
                                                onClick={() => { onVerDetalle(reserva.id_reserva); setMostrarArchivo(false) }}
                                            >
                                                <FiEye size={12} /> Ver detalle
                                            </button>
                                            <button
                                                className="cr-btn cr-btn-reiterar"
                                                onClick={() => { setReservaAReiterar(reserva); setMostrarArchivo(false) }}
                                            >
                                                <FiRefreshCw size={12} /> Reiterar
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CalendarioReservas
