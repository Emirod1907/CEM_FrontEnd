import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getMiSalon,
    updateSalon,
    getMiSalonReservas,
    actualizarPreciosSalon,
    gestionarReservaDueno,
    crearReservaManual,
    getGoogleCalendarStatus,
    disconnectGoogleCalendar,
    googleCalendarConnectUrl
} from '../../../services/salonesServices'
import { FiHome, FiEdit2, FiX, FiMapPin, FiUsers, FiDollarSign,
         FiCalendar, FiCheck, FiSlash, FiPlus, FiTrash2, FiSave, FiChevronLeft, FiChevronRight,
         FiInfo, FiLink, FiExternalLink } from 'react-icons/fi'
import PreciosConfigPanel from '../../PreciosConfigPanel/PreciosConfigPanel'
import MpConnectButton from '../../MpConnectButton/MpConnectButton'
import ReservaDetalleHorizontal from './ReservaDetalleHorizontal'
import { parsePreciosConfig } from '../../../utils/preciosUtils'
import './MiSalonScreen.css'

// ─── helpers ──────────────────────────────────────────────────────────────────

const parseJson = (val, fallback = []) => {
    try { return JSON.parse(val) } catch { return fallback }
}

const ESTADO_LABEL = {
    pendiente_pago: 'Pendiente de pago',
    seña_abonada:   'Seña abonada',
    confirmada:     'Confirmada',
    cancelada:      'Cancelada',
}
const ESTADO_CLASS = {
    pendiente_pago: 'estado-pendiente',
    seña_abonada:   'estado-sena',
    confirmada:     'estado-confirmada',
    cancelada:      'estado-cancelada',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

const CONFIG_DEFAULT = {
    turnos: ['4 horas', '5 horas'],
    filas: [
        { label: 'Sábados, Domingos y Feriados', precios: {} },
        { label: 'Viernes', precios: {} },
        { label: 'Lunes a Jueves', precios: {} },
    ],
    notas: 'Los precios son actuales y se mantienen sin modificaciones durante 1 mes a partir del momento en que se efectúe la seña.',
}

// ─── Calendario mensual (usado en la vista de zoom) ──────────────────────────

const Calendario = ({ reservas, mes, año, diaSeleccionado, onDiaClick, popoverDia, onAgregarReserva }) => {
    const primerDia = new Date(año, mes, 1)
    const totalDias = new Date(año, mes + 1, 0).getDate()
    const inicioSemana = (primerDia.getDay() + 6) % 7

    const celdas = []
    for (let i = 0; i < inicioSemana; i++) celdas.push(null)
    for (let d = 1; d <= totalDias; d++) celdas.push(d)

    const fechaStr = (dia) =>
        `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

    const reservaPorDia = (dia) =>
        reservas.find(r => r.fecha && r.fecha.startsWith(fechaStr(dia)) && r.estado !== 'cancelada') || null

    const hoy = new Date()
    const esPasado = (dia) => {
        if (!dia) return false
        const d = new Date(año, mes, dia)
        d.setHours(0, 0, 0, 0)
        const h = new Date(); h.setHours(0, 0, 0, 0)
        return d < h
    }

    return (
        <div className='cal-wrapper'>
            <div className='cal-header-dias'>
                {DIAS_SEMANA.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className='cal-grid'>
                {celdas.map((dia, i) => {
                    const reserva = dia ? reservaPorDia(dia) : null
                    const esHoy = dia && hoy.getFullYear() === año &&
                                  hoy.getMonth() === mes && hoy.getDate() === dia
                    const pasado = esPasado(dia)
                    const tienePopover = dia && !reserva && !pasado && dia === popoverDia
                    return (
                        <div
                            key={i}
                            className={[
                                'cal-celda',
                                !dia ? 'cal-vacia' : '',
                                pasado ? 'cal-pasado' : '',
                                !pasado && reserva ? `cal-${reserva.estado}` : '',
                                dia === diaSeleccionado ? 'cal-seleccionada' : '',
                                esHoy ? 'cal-hoy' : '',
                                dia && !reserva && !pasado ? 'cal-libre' : '',
                            ].join(' ')}
                            onClick={() => dia && !pasado && onDiaClick(dia, reserva)}
                        >
                            {dia && <span className='cal-num'>{dia}</span>}
                            {tienePopover && (
                                <div className='cal-popover' onClick={e => e.stopPropagation()}>
                                    <button
                                        className='cal-popover-btn'
                                        onClick={() => onAgregarReserva(dia)}
                                    >
                                        <FiPlus size={12}/> Agregar reserva /<br/>Bloquear fecha
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className='cal-leyenda'>
                <span className='cal-leyenda-item'><span className='cal-dot cal-pendiente_pago'/>Pendiente de pago</span>
                <span className='cal-leyenda-item'><span className='cal-dot cal-seña_abonada'/>Seña abonada</span>
                <span className='cal-leyenda-item'><span className='cal-dot cal-confirmada'/>Confirmada</span>
                <span className='cal-leyenda-item'><span className='cal-dot cal-cancelada'/>Cancelada</span>
            </div>
        </div>
    )
}

// ─── Mini-mes para la vista anual ─────────────────────────────────────────────

const DIAS_MINI = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const MiniMesSalon = ({ año, mes, reservasPorFecha, onClick }) => {
    const inicioSemana = (new Date(año, mes, 1).getDay() + 6) % 7   // lunes=0
    const diasEnMes    = new Date(año, mes + 1, 0).getDate()
    const hoy          = new Date(); hoy.setHours(0, 0, 0, 0)

    const reservasMes = Object.entries(reservasPorFecha).filter(([f, r]) => {
        const [y, m] = f.split('-').map(Number)
        return y === año && m === mes + 1 && r.estado !== 'cancelada'
    })

    const celdas = []
    for (let i = 0; i < inicioSemana; i++) celdas.push(null)
    for (let d = 1; d <= diasEnMes; d++) {
        const fStr   = `${año}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const reserva = reservasPorFecha[fStr] || null
        const esHoy  = new Date(año, mes, d).getTime() === hoy.getTime()
        celdas.push({ reserva, esHoy })
    }

    return (
        <button
            type='button'
            className={`mm-salon-card ${reservasMes.length > 0 ? 'mm-salon-con-reservas' : ''}`}
            onClick={() => onClick(mes)}
            aria-label={`Ver ${MESES[mes]} ${año}`}
        >
            <div className='mm-salon-header'>
                <span className='mm-salon-nombre'>{MESES[mes]}</span>
                {reservasMes.length > 0 && (
                    <span className='mm-salon-badge'>{reservasMes.length}</span>
                )}
            </div>
            <div className='mm-salon-dias-semana'>
                {DIAS_MINI.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className='mm-salon-grid'>
                {celdas.map((celda, i) => {
                    if (celda === null) return <div key={`v${i}`} className='mm-salon-cel mm-salon-vacio' />
                    const { reserva, esHoy } = celda
                    let cls = 'mm-salon-cel'
                    if (reserva) {
                        if      (reserva.estado === 'confirmada')      cls += ' mm-salon-confirmada'
                        else if (reserva.estado === 'seña_abonada')    cls += ' mm-salon-sena'
                        else if (reserva.estado === 'pendiente_pago')  cls += ' mm-salon-pendiente'
                        else                                           cls += ' mm-salon-cancelada'
                    }
                    if (esHoy) cls += ' mm-salon-hoy'
                    return <div key={i} className={cls} />
                })}
            </div>
        </button>
    )
}

const CalendarioAnualSalon = ({ reservas, año, onClickMes }) => {
    const reservasPorFecha = {}
    reservas.forEach(r => {
        if (r.fecha && r.estado !== 'cancelada') reservasPorFecha[r.fecha.split('T')[0]] = r
    })

    return (
        <div className='cal-anual-salon'>
            {MESES.map((_, mes) => (
                <MiniMesSalon
                    key={mes}
                    año={año}
                    mes={mes}
                    reservasPorFecha={reservasPorFecha}
                    onClick={onClickMes}
                />
            ))}
        </div>
    )
}

// ─── Tab Info ─────────────────────────────────────────────────────────────────

const TabInfo = ({ salon, onEditar }) => {
    const servicios = parseJson(salon.servicios_incluidos)
    const tiposEvento = parseJson(salon.tipos_evento)

    return (
        <div className='tab-info'>
            <div className='mi-salon-card'>
                {salon.imagen && (
                    <div className='mi-salon-img-wrap'>
                        <img src={salon.imagen} alt={salon.nombre} className='mi-salon-img' />
                    </div>
                )}
                <div className='mi-salon-body'>
                    <div className='mi-salon-body-header'>
                        <h2>{salon.nombre}</h2>
                        <button className='btn-editar-info' onClick={onEditar}>
                            <FiEdit2 size={15} /> Editar
                        </button>
                    </div>
                    <div className='mi-salon-datos-grid'>
                        <div className='dato-item'>
                            <FiMapPin size={15} className='dato-icon'/>
                            <div>
                                <span className='dato-label'>Ubicación</span>
                                <span className='dato-val'>
                                    {[salon.domicilio, salon.localidad, salon.departamento, salon.provincia].filter(Boolean).join(', ')}
                                </span>
                            </div>
                        </div>
                        <div className='dato-item'>
                            <FiUsers size={15} className='dato-icon'/>
                            <div>
                                <span className='dato-label'>Aforo</span>
                                <span className='dato-val'>{salon.aforo} personas</span>
                            </div>
                        </div>
                        <div className='dato-item'>
                            <FiDollarSign size={15} className='dato-icon'/>
                            <div>
                                <span className='dato-label'>Precio base de alquiler</span>
                                <span className='dato-val'>${Number(salon.precio_alquiler).toLocaleString('es-AR')} ARS</span>
                            </div>
                        </div>
                    </div>

                    {servicios.length > 0 && (
                        <div className='tags-seccion'>
                            <span className='tags-titulo'>Servicios incluidos</span>
                            <div className='tags-row'>
                                {servicios.map(s => <span key={s} className='tag tag-servicio'>{s}</span>)}
                            </div>
                        </div>
                    )}
                    {tiposEvento.length > 0 && (
                        <div className='tags-seccion'>
                            <span className='tags-titulo'>Ideal para</span>
                            <div className='tags-row'>
                                {tiposEvento.map(t => <span key={t} className='tag tag-evento'>{t}</span>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cobros — conexión de MercadoPago del dueño (recibe el alquiler directo) */}
            <div className='mi-salon-card mp-cobros-card'>
                <div className='mp-cobros-info'>
                    <h3><FiDollarSign size={16} /> Cobros — MercadoPago</h3>
                    <p>Conectá tu cuenta de MercadoPago para recibir el alquiler de tus reservas y que la liquidación se acredite en tu cuenta.</p>
                </div>
                <MpConnectButton />
            </div>
        </div>
    )
}

// ─── Tab Precios ──────────────────────────────────────────────────────────────

const TabPrecios = ({ salon, onGuardado }) => {
    const [config, setConfig] = useState(() => parsePreciosConfig(salon.precios_config) || {})
    const [guardando, setGuardando] = useState(false)
    const [exito, setExito] = useState(false)
    const [error, setError] = useState(null)

    const guardar = async () => {
        setGuardando(true); setError(null)
        try {
            await actualizarPreciosSalon(config)
            setExito(true)
            onGuardado(config)
            setTimeout(() => setExito(false), 2500)
        } catch {
            setError('Error al guardar los precios. Intentá de nuevo.')
        } finally { setGuardando(false) }
    }

    return (
        <div className='tab-precios'>
            <div className='precios-card'>
                <div className='precios-card-header'>
                    <h3>Configuración de precios</h3>
                    <p>Definí precios diferenciados para fines de semana, feriados y, opcionalmente, cobrá por hora.</p>
                </div>

                <div className='precios-base-row'>
                    <span className='precios-base-label'>Precio base del evento:</span>
                    <strong className='precios-base-val'>
                        ${Number(salon.precio_alquiler || 0).toLocaleString('es-AR')}
                    </strong>
                    <span className='precios-base-hint'>(modificar en la pestaña Información)</span>
                </div>

                <PreciosConfigPanel
                    config={config}
                    onChange={setConfig}
                    dark={true}
                    precioBase={salon.precio_alquiler}
                    showHoraToggle={true}
                    showHorario={true}
                />

                {error && <p className='precios-error'>{error}</p>}

                <div className='precios-footer'>
                    {exito && <span className='precios-exito'><FiCheck size={14}/> Guardado</span>}
                    <button className='btn-guardar-precios' onClick={guardar} disabled={guardando}>
                        <FiSave size={15}/> {guardando ? 'Guardando...' : 'Guardar precios'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── helpers de display para reservas ────────────────────────────────────────

const nombreOrganizador = (r) =>
    r.datos_evento?.manual
        ? (r.datos_evento.nombre_organizador || 'Sin nombre')
        : `${r.Persona?.nombre || ''} ${r.Persona?.apellido || ''}`.trim()

const emailOrganizador = (r) =>
    r.datos_evento?.manual
        ? (r.datos_evento.email_organizador || '—')
        : (r.Persona?.email || '—')

const FORM_MANUAL_VACIO = {
    nombre_organizador: '',
    email_organizador: '',
    tipo_evento: '',
    estado: 'confirmada',
    notas: '',
    enviar_notificacion: false,
}

// ─── Tab Reservas ─────────────────────────────────────────────────────────────

const TabReservas = ({ reservas, onActualizar, nombreSalon }) => {
    const hoy = new Date()
    const [año,       setAño]       = useState(hoy.getFullYear())
    const [mesZoom,   setMesZoom]   = useState(null)    // null = vista anual
    const [vistaKey,  setVistaKey]  = useState(0)
    const [zoomOrigin, setZoomOrigin] = useState('center center')

    const [diaSeleccionado,   setDiaSeleccionado]   = useState(null)
    const [reservaSeleccionada, setReservaSeleccionada] = useState(null)  // detalle horizontal arriba (lista o calendario)
    const [accionando,        setAccionando]        = useState(false)
    const [confirmando,       setConfirmando]       = useState(null)

    const [popoverDia,       setPopoverDia]       = useState(null)
    const [mostrarFormManual, setMostrarFormManual] = useState(false)
    const [fechaManual,      setFechaManual]      = useState(null)
    const [formManual,       setFormManual]       = useState(FORM_MANUAL_VACIO)
    const [guardandoManual,  setGuardandoManual]  = useState(false)
    const [errorManual,      setErrorManual]      = useState(null)
    const [filtroEstado,     setFiltroEstado]     = useState('')
    const [filtroTipo,       setFiltroTipo]       = useState('')   // '' | 'interna' | 'externa'
    const [mostrarArchivo,   setMostrarArchivo]   = useState(false)
    const [filtroArchivo,    setFiltroArchivo]    = useState('')   // '' | 'pasada' | 'cancelada'
    const [archivoSel,       setArchivoSel]       = useState(null) // reserva seleccionada en el archivo
    const [mostrarCal,   setMostrarCal]   = useState(false)   // modal de Google Calendar
    const [calConectado, setCalConectado] = useState(false)
    const [calCargando,  setCalCargando]  = useState(false)
    const [calMsg,       setCalMsg]       = useState(null)    // feedback tras el callback

    // Al montar: estado de conexión + leer el resultado del callback (?calendar=)
    useEffect(() => {
        getGoogleCalendarStatus().then(setCalConectado)
        const params = new URLSearchParams(window.location.search)
        const r = params.get('calendar')
        if (r) {
            const mapa = {
                conectado:  { tipo: 'ok',  texto: '¡Google Calendar conectado! Tus reservas se sincronizarán automáticamente.' },
                cancelado:  { tipo: 'err', texto: 'Cancelaste la conexión con Google Calendar.' },
                sin_refresh:{ tipo: 'err', texto: 'Google no devolvió el permiso de sincronización. Probá de nuevo y aceptá todos los accesos.' },
                error:      { tipo: 'err', texto: 'No se pudo conectar con Google Calendar. Intentá de nuevo.' },
            }
            setCalMsg(mapa[r] || null)
            if (r === 'conectado') { setMostrarCal(true); getGoogleCalendarStatus().then(setCalConectado) }
            // limpiar el query param de la URL
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [])

    const aceptarYConectar = () => {
        // Navegación top-level: manda la cookie de sesión y va a la pantalla de Google
        window.location.href = googleCalendarConnectUrl()
    }

    const desconectarCalendario = async () => {
        setCalCargando(true)
        try {
            await disconnectGoogleCalendar()
            setCalConectado(false)
            setCalMsg({ tipo: 'ok', texto: 'Google Calendar desconectado.' })
        } catch {
            setCalMsg({ tipo: 'err', texto: 'No se pudo desconectar. Intentá de nuevo.' })
        } finally {
            setCalCargando(false)
        }
    }


    // "Hoy" a medianoche para separar futuro/pasado
    const hoyCero = new Date(); hoyCero.setHours(0, 0, 0, 0)
    const esPasada = (r) => r.fecha && new Date(r.fecha.split('T')[0] + 'T00:00:00') < hoyCero

    // Reservas activas del período (sin canceladas y de hoy en adelante)
    const reservasActivas = reservas.filter(r => {
        if (!r.fecha || r.estado === 'cancelada') return false
        if (esPasada(r)) return false   // las pasadas van al archivo
        const [y, m] = r.fecha.split('T')[0].split('-').map(Number)
        if (y !== año) return false
        if (mesZoom !== null && m !== mesZoom + 1) return false
        return true
    })

    // Archivo: canceladas + pasadas (de todo el año)
    const reservasArchivadas = reservas
        .filter(r => r.estado === 'cancelada' || esPasada(r))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    // Filtro del archivo: todas / pasadas (finalizadas, no canceladas) / canceladas
    const archivadasFiltradas = reservasArchivadas.filter(r => {
        if (filtroArchivo === 'cancelada') return r.estado === 'cancelada'
        if (filtroArchivo === 'pasada')    return r.estado !== 'cancelada' && esPasada(r)
        return true
    })

    // Aplicar filtros tipo + estado sobre activas
    const reservasFiltradas = reservasActivas
        .filter(r => {
            if (filtroTipo === 'interna' &&  r.datos_evento?.manual) return false
            if (filtroTipo === 'externa' && !r.datos_evento?.manual) return false
            if (filtroEstado && r.estado !== filtroEstado) return false
            return true
        })
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

    const totalSinFiltro = reservasActivas.length

    // ── Navegar al mes con zoom ──────────────────────────────────────────────
    const handleClickMes = (mes) => {
        const col  = mes % 4
        const row  = Math.floor(mes / 4)
        const xPct = [12.5, 37.5, 62.5, 87.5][col]
        const yPct = [16.7, 50, 83.3][row]
        setZoomOrigin(`${xPct}% ${yPct}%`)
        setMesZoom(mes)
        setVistaKey(k => k + 1)
        cerrarPaneles()
    }

    const handleVolverAnual = () => {
        setMesZoom(null)
        setVistaKey(k => k + 1)
        cerrarPaneles()
    }

    const cerrarPaneles = () => {
        setDiaSeleccionado(null)
        setReservaSeleccionada(null)
        setConfirmando(null)
        setPopoverDia(null)
        setMostrarFormManual(false)
        setFechaManual(null)
        setFormManual(FORM_MANUAL_VACIO)
        setErrorManual(null)
    }

    // Click desde el CALENDARIO: si hay reserva → muestra el detalle horizontal arriba;
    // si no, popover de día vacío (crear reserva manual).
    const onDiaClick = (dia, reserva) => {
        if (diaSeleccionado === dia && !reserva && popoverDia === dia)  { cerrarPaneles(); return }
        setDiaSeleccionado(dia)
        setConfirmando(null)
        if (reserva) {
            setReservaSeleccionada(reserva)
            setPopoverDia(null)
            setMostrarFormManual(false)
            setFechaManual(null)
        } else {
            setReservaSeleccionada(null)
            setPopoverDia(dia)
            setMostrarFormManual(false)
        }
    }

    // Click desde el LISTADO: muestra el detalle horizontal arriba y achica el calendario
    const onReservaListaClick = (reserva) => {
        if (reservaSeleccionada?.id_reserva === reserva.id_reserva) { setReservaSeleccionada(null); return }
        setReservaSeleccionada(reserva)
        setConfirmando(null)
        if (mesZoom === null) handleClickMes(new Date(reserva.fecha).getUTCMonth())
    }

    const abrirModalManual = (dia) => {
        const fechaStr = `${año}-${String(mesZoom + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        setPopoverDia(null)
        setFechaManual(fechaStr)
        setFormManual(FORM_MANUAL_VACIO)
        setErrorManual(null)
        setMostrarFormManual(true)
    }

    const handleFormManualChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormManual(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const guardarManual = async (e) => {
        e.preventDefault()
        if (!fechaManual) return
        setGuardandoManual(true)
        setErrorManual(null)
        try {
            await crearReservaManual({ fecha: fechaManual, ...formManual })
            await onActualizar()
            cerrarPaneles()
        } catch (err) {
            setErrorManual(err?.response?.data?.message || 'Error al guardar. Intentá de nuevo.')
        } finally {
            setGuardandoManual(false)
        }
    }

    const ejecutarAccion = async (id, estado) => {
        setAccionando(true)
        try {
            await gestionarReservaDueno(id, estado)
            await onActualizar()
            cerrarPaneles()
        } catch { /* no-op */ } finally { setAccionando(false) }
    }

    const fechaDisplay = (fechaStr) => new Date(fechaStr).toLocaleDateString('es-AR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    })

    const tituloLista = mesZoom !== null
        ? `Reservas de ${MESES[mesZoom]}`
        : `Reservas de ${año}`

    const textoVacio = (filtroEstado || filtroTipo)
        ? 'Sin reservas con ese filtro.'
        : mesZoom !== null ? 'No hay reservas activas este mes.' : 'No hay reservas activas este año.'

    return (
        <div className='tab-reservas'>
            {/* Detalle horizontal arriba (al tocar una reserva del listado) */}
            {reservaSeleccionada && (
                <ReservaDetalleHorizontal
                    reserva={reservaSeleccionada}
                    onCerrar={() => setReservaSeleccionada(null)}
                    onAccion={ejecutarAccion}
                    accionando={accionando}
                />
            )}

            <div className={`reservas-layout ${reservaSeleccionada ? 'reservas-layout--con-detalle' : ''}`}>

                {/* ── Columna izquierda: lista + filtro ── */}
                <div className='reservas-col-izq'>
                    <div className='reservas-lista-header'>
                        {/* Título arriba de todo */}
                        <div className='reservas-contadores'>
                            <span className='reservas-lista-titulo'>
                                {tituloLista}
                                <span className='reservas-lista-count'>{totalSinFiltro}</span>
                            </span>
                            {(filtroTipo || filtroEstado) && (
                                <span className='reservas-lista-titulo reservas-lista-titulo--sub'>
                                    Filtradas
                                    <span className='reservas-lista-count reservas-lista-count--filtrado'>{reservasFiltradas.length}</span>
                                </span>
                            )}
                        </div>
                        {/* Fila de controles: filtros a la izquierda, acciones a la derecha (misma altura) */}
                        <div className='reservas-controles'>
                            <div className='filtros-selects'>
                                <select
                                    className='filtro-estado-select'
                                    value={filtroTipo}
                                    onChange={e => setFiltroTipo(e.target.value)}
                                >
                                    <option value=''>Todas</option>
                                    <option value='interna'>Internas</option>
                                    <option value='externa'>Externas</option>
                                </select>
                                <select
                                    className='filtro-estado-select'
                                    value={filtroEstado}
                                    onChange={e => setFiltroEstado(e.target.value)}
                                >
                                    <option value=''>Todos los estados</option>
                                    <option value='pendiente_pago'>Pendiente de pago</option>
                                    <option value='seña_abonada'>Seña abonada</option>
                                    <option value='confirmada'>Confirmada</option>
                                </select>
                            </div>
                            <div className='filtros-acciones'>
                                <button
                                    className={`btn-exportar-cal ${calConectado ? 'conectado' : ''}`}
                                    onClick={() => setMostrarCal(true)}
                                    title='Sincronizar tus reservas con Google Calendar'
                                >
                                    <FiCalendar size={13} /> {calConectado ? 'Calendar ✓' : 'Google Calendar'}
                                </button>
                                <button className='btn-archivo' onClick={() => setMostrarArchivo(true)}>
                                    Archivo {reservasArchivadas.length > 0 && <span className='archivo-badge'>{reservasArchivadas.length}</span>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Feedback tras el callback de Google */}
                    {calMsg && (
                        <div className={`cal-flash cal-flash--${calMsg.tipo}`}>
                            {calMsg.tipo === 'ok' ? <FiCheck size={14} /> : <FiInfo size={14} />}
                            <span>{calMsg.texto}</span>
                            <button className='cal-flash-x' onClick={() => setCalMsg(null)}><FiX size={14} /></button>
                        </div>
                    )}


                    {/* Modal: conectar Google Calendar (OAuth + T&C) */}
                    {mostrarCal && (
                        <div className='cal-ayuda-overlay' onClick={() => setMostrarCal(false)}>
                            <div className='cal-ayuda-modal' onClick={e => e.stopPropagation()}>
                                <div className='cal-ayuda-head'>
                                    <FiCalendar size={18} />
                                    <h3>Sincronizar con Google Calendar</h3>
                                    <button className='cal-ayuda-x' onClick={() => setMostrarCal(false)}><FiX size={18} /></button>
                                </div>

                                {calConectado ? (
                                    <>
                                        <div className='cal-estado-ok'>
                                            <FiCheck size={18} />
                                            <span>Tu Google Calendar está <strong>conectado</strong> y todo se sincroniza <strong>automáticamente</strong>.</span>
                                        </div>
                                        <ul className='cal-auto-lista'>
                                            <li><FiCheck size={13} /> Tus eventos de Google bloquean las fechas en Dream Events.</li>
                                            <li><FiCheck size={13} /> Cada reserva nueva se agenda sola en tu calendario, con recordatorios.</li>
                                            <li><FiCheck size={13} /> Cambios y cancelaciones se reflejan al instante.</li>
                                        </ul>
                                        <button className='cal-btn-desconectar' onClick={desconectarCalendario} disabled={calCargando}>
                                            {calCargando ? 'Desconectando...' : 'Desconectar Google Calendar'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className='cal-ayuda-sub'>Conectá tu cuenta de Google para que las reservas de tu salón se agenden solas y bloqueen las fechas.</p>
                                        <div className='cal-terminos'>
                                            <FiInfo size={14} />
                                            <span>Para sincronizar tu agenda, <strong>Dream Events se conectará a tu Google Calendar</strong>. Al continuar, autorizás esta integración; podés desconectarla cuando quieras desde acá.</span>
                                        </div>
                                        <button className='cal-btn-conectar' onClick={aceptarYConectar}>
                                            <FiLink size={15} /> Conectar Google Calendar <FiExternalLink size={13} />
                                        </button>
                                        <p className='cal-ayuda-nota-min'>Se abrirá la pantalla de Google para autorizar (una sola vez).</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {reservasFiltradas.length === 0 ? (
                        <p className='reservas-vacio'>{textoVacio}</p>
                    ) : (
                        <div className='reservas-lista'>
                            {reservasFiltradas.map(r => (
                                <div
                                    key={r.id_reserva}
                                    className={`reserva-item ${r.id_reserva === reservaSeleccionada?.id_reserva ? 'reserva-item-activa' : ''}`}
                                    onClick={() => onReservaListaClick(r)}
                                >
                                    <div className='reserva-item-left'>
                                        <div className='reserva-item-fecha-col'>
                                            <span className='reserva-item-fecha'>
                                                {new Date(r.fecha).toLocaleDateString('es-AR', {
                                                    day: '2-digit', month: 'short', timeZone: 'UTC'
                                                })}
                                            </span>
                                            <span className='reserva-item-anio'>
                                                {new Date(r.fecha).toLocaleDateString('es-AR', { year: 'numeric', timeZone: 'UTC' })}
                                            </span>
                                        </div>
                                        <div>
                                            <span className='reserva-item-nombre'>
                                                {nombreOrganizador(r)}
                                            </span>
                                            <span className='reserva-item-email'>{emailOrganizador(r)}</span>
                                        </div>
                                    </div>
                                    <div className='reserva-item-right'>
                                        <span className={`tipo-pill ${r.datos_evento?.manual ? 'tipo-externa' : 'tipo-interna'}`}>
                                            {r.datos_evento?.manual ? 'Externa' : 'Interna'}
                                        </span>
                                        <span className={`estado-badge ${ESTADO_CLASS[r.estado]}`}>
                                            {ESTADO_LABEL[r.estado]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* El detalle ahora se muestra horizontal arriba (lista) o en modal (calendario) */}
                </div>

                {/* ── Columna derecha: calendario ── */}
                <div className='reservas-col-der'>
                    {/* Cabecera: año o mes con botón volver */}
                    <div className='mes-nav'>
                        {mesZoom !== null ? (
                            <button className='mes-btn' onClick={handleVolverAnual} title='Volver a vista anual'>
                                <FiChevronLeft size={18}/>
                            </button>
                        ) : (
                            <button className='mes-btn' onClick={() => setAño(a => a - 1)}>
                                <FiChevronLeft size={18}/>
                            </button>
                        )}

                        <span className='mes-titulo'>
                            {mesZoom !== null ? `${MESES[mesZoom]} ${año}` : año}
                        </span>

                        {mesZoom !== null ? (
                            /* botón invisible para mantener el centrado */
                            <span style={{ width: 36 }} />
                        ) : (
                            <button className='mes-btn' onClick={() => setAño(a => a + 1)}>
                                <FiChevronRight size={18}/>
                            </button>
                        )}
                    </div>

                    {/* Vista anual */}
                    {mesZoom === null && (
                        <CalendarioAnualSalon
                            key={`anual-${vistaKey}-${año}`}
                            reservas={reservas}
                            año={año}
                            onClickMes={handleClickMes}
                        />
                    )}

                    {/* Vista mensual con zoom */}
                    {mesZoom !== null && (
                        <div
                            key={`mes-${vistaKey}`}
                            className='cal-zoom-mes'
                            style={{ '--zoom-origin': zoomOrigin }}
                        >
                            <Calendario
                                reservas={reservas}
                                mes={mesZoom}
                                año={año}
                                diaSeleccionado={diaSeleccionado}
                                onDiaClick={onDiaClick}
                                popoverDia={popoverDia}
                                onAgregarReserva={abrirModalManual}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal: archivo de canceladas ── */}
            {mostrarArchivo && (
                <div className='modal-overlay' onClick={() => { setMostrarArchivo(false); setArchivoSel(null) }}>
                    <div className='modal-box modal-box--wide' onClick={e => e.stopPropagation()}>
                        <div className='modal-header'>
                            <div>
                                <h2>Archivo de reservas</h2>
                                <span className='panel-fecha-subtitulo'>{archivadasFiltradas.length} reserva(s)</span>
                            </div>
                            <button className='btn-cerrar-modal' onClick={() => { setMostrarArchivo(false); setArchivoSel(null) }}><FiX size={20}/></button>
                        </div>

                        {/* Filtros: todas / pasadas / canceladas */}
                        <div className='archivo-filtros'>
                            <button className={`archivo-filtro ${filtroArchivo === '' ? 'activo' : ''}`} onClick={() => { setFiltroArchivo(''); setArchivoSel(null) }}>Todas</button>
                            <button className={`archivo-filtro ${filtroArchivo === 'pasada' ? 'activo' : ''}`} onClick={() => { setFiltroArchivo('pasada'); setArchivoSel(null) }}>Pasadas</button>
                            <button className={`archivo-filtro ${filtroArchivo === 'cancelada' ? 'activo' : ''}`} onClick={() => { setFiltroArchivo('cancelada'); setArchivoSel(null) }}>Canceladas</button>
                        </div>

                        {/* Detalle horizontal de la reserva seleccionada */}
                        {archivoSel && (
                            <div className='archivo-detalle-wrap'>
                                <ReservaDetalleHorizontal
                                    reserva={archivoSel}
                                    onCerrar={() => setArchivoSel(null)}
                                />
                            </div>
                        )}

                        <div className='archivo-lista'>
                            {archivadasFiltradas.length === 0 ? (
                                <p className='reservas-vacio'>No hay reservas en este filtro.</p>
                            ) : archivadasFiltradas.map(r => {
                                const cancelada = r.estado === 'cancelada'
                                return (
                                    <div
                                        key={r.id_reserva}
                                        className={`reserva-item ${r.id_reserva === archivoSel?.id_reserva ? 'reserva-item-activa' : ''}`}
                                        onClick={() => setArchivoSel(prev => prev?.id_reserva === r.id_reserva ? null : r)}
                                    >
                                        <div className='reserva-item-left'>
                                            <div className='reserva-item-fecha-col'>
                                                <span className='reserva-item-fecha'>
                                                    {new Date(r.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                                                </span>
                                                <span className='reserva-item-anio'>
                                                    {new Date(r.fecha).toLocaleDateString('es-AR', { year: 'numeric', timeZone: 'UTC' })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className='reserva-item-nombre'>{nombreOrganizador(r)}</span>
                                                <span className='reserva-item-email'>{emailOrganizador(r)}</span>
                                            </div>
                                        </div>
                                        <div className='reserva-item-right'>
                                            <span className={`tipo-pill ${r.datos_evento?.manual ? 'tipo-externa' : 'tipo-interna'}`}>
                                                {r.datos_evento?.manual ? 'Externa' : 'Interna'}
                                            </span>
                                            <span className={`estado-badge ${cancelada ? 'estado-cancelada' : 'estado-confirmada'}`}>
                                                {cancelada ? 'Cancelada' : 'Finalizada'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: agregar reserva manual ── */}
            {mostrarFormManual && fechaManual && (
                <div className='modal-overlay' onClick={cerrarPaneles}>
                    <div className='modal-box' onClick={e => e.stopPropagation()}>
                        <div className='modal-header'>
                            <div>
                                <h2>Agregar reserva / Bloquear fecha</h2>
                                <span className='panel-fecha-subtitulo'>{fechaDisplay(fechaManual)}</span>
                            </div>
                            <button className='btn-cerrar-modal' onClick={cerrarPaneles}><FiX size={20}/></button>
                        </div>
                        <form onSubmit={guardarManual} className='modal-form'>
                            <div className='mf-row'>
                                <div className='mf-group'>
                                    <label>Nombre del organizador / festejado</label>
                                    <input
                                        type='text'
                                        name='nombre_organizador'
                                        value={formManual.nombre_organizador}
                                        onChange={handleFormManualChange}
                                        placeholder='Ej: María García'
                                        maxLength={100}
                                    />
                                </div>
                                <div className='mf-group'>
                                    <label>Email (para notificación)</label>
                                    <input
                                        type='email'
                                        name='email_organizador'
                                        value={formManual.email_organizador}
                                        onChange={handleFormManualChange}
                                        placeholder='ejemplo@gmail.com'
                                    />
                                </div>
                            </div>
                            <div className='mf-row'>
                                <div className='mf-group'>
                                    <label>Tipo de evento</label>
                                    <input
                                        type='text'
                                        name='tipo_evento'
                                        value={formManual.tipo_evento}
                                        onChange={handleFormManualChange}
                                        placeholder='Ej: Cumpleaños de 15, Boda...'
                                        maxLength={80}
                                    />
                                </div>
                                <div className='mf-group'>
                                    <label>Estado de pago</label>
                                    <select name='estado' value={formManual.estado} onChange={handleFormManualChange}>
                                        <option value='pendiente_pago'>Pendiente de pago</option>
                                        <option value='seña_abonada'>Seña abonada</option>
                                        <option value='confirmada'>Confirmada (total abonado)</option>
                                        <option value='cancelada'>Cancelada</option>
                                    </select>
                                </div>
                            </div>
                            <div className='mf-group'>
                                <label>Notas (opcional)</label>
                                <textarea
                                    name='notas'
                                    value={formManual.notas}
                                    onChange={handleFormManualChange}
                                    placeholder='Detalles internos, condiciones pactadas, etc.'
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>
                            <label className='fm-checkbox'>
                                <input
                                    type='checkbox'
                                    name='enviar_notificacion'
                                    checked={formManual.enviar_notificacion}
                                    onChange={handleFormManualChange}
                                    disabled={!formManual.email_organizador}
                                />
                                <span>
                                    Notificar al cliente sobre los servicios adicionales disponibles en Dream Events
                                    {!formManual.email_organizador && <em className='fm-hint'> (ingresá un email primero)</em>}
                                </span>
                            </label>
                            {errorManual && <p className='mf-error'>{errorManual}</p>}
                            <div className='mf-acciones'>
                                <button type='button' className='btn-cancelar-modal' onClick={cerrarPaneles}>Cancelar</button>
                                <button type='submit' className='btn-guardar-modal' disabled={guardandoManual}>
                                    {guardandoManual ? 'Guardando...' : 'Guardar y bloquear fecha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Modal de edición de info ─────────────────────────────────────────────────

const ModalEditInfo = ({ salon, onGuardado, onCerrar }) => {
    const [form, setForm] = useState({
        nombre: salon.nombre || '',
        domicilio: salon.domicilio || '',
        departamento: salon.departamento || '',
        localidad: salon.localidad || '',
        provincia: salon.provincia || '',
        tipo_salon: salon.tipo_salon || '',
        aforo: salon.aforo ?? '',
        precio_alquiler: salon.precio_alquiler ?? '',
        imagen: salon.imagen || '',
    })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)

    const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const guardar = async e => {
        e.preventDefault()
        if (!form.nombre || !form.domicilio || !form.aforo || !form.precio_alquiler) {
            setError('Nombre, domicilio, aforo y precio son obligatorios.')
            return
        }
        setGuardando(true)
        setError(null)
        try {
            await updateSalon(salon.id_bodega, {
                nombre: form.nombre.trim(),
                domicilio: form.domicilio.trim(),
                departamento: form.departamento.trim() || null,
                localidad: form.localidad.trim() || null,
                provincia: form.provincia.trim() || null,
                tipo_salon: form.tipo_salon || null,
                aforo: parseInt(form.aforo),
                precio_alquiler: parseFloat(form.precio_alquiler),
                imagen: form.imagen.trim() || null,
            })
            await onGuardado()
            onCerrar()
        } catch (err) {
            setError(err?.response?.data?.message || 'Error al guardar. Intentá de nuevo.')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className='modal-overlay' onClick={onCerrar}>
            <div className='modal-box' onClick={e => e.stopPropagation()}>
                <div className='modal-header'>
                    <h2>Editar información del salón</h2>
                    <button className='btn-cerrar-modal' onClick={onCerrar}><FiX size={20}/></button>
                </div>
                <form onSubmit={guardar} className='modal-form'>
                    <div className='mf-group'>
                        <label>Nombre *</label>
                        <input name='nombre' value={form.nombre} onChange={handleChange} maxLength={100}/>
                    </div>
                    <div className='mf-group'>
                        <label>Domicilio *</label>
                        <input name='domicilio' value={form.domicilio} onChange={handleChange} maxLength={100}/>
                    </div>
                    <div className='mf-row'>
                        <div className='mf-group'>
                            <label>Departamento</label>
                            <input name='departamento' value={form.departamento} onChange={handleChange} maxLength={50}/>
                        </div>
                        <div className='mf-group'>
                            <label>Localidad</label>
                            <input name='localidad' value={form.localidad} onChange={handleChange} maxLength={50}/>
                        </div>
                    </div>
                    <div className='mf-row'>
                        <div className='mf-group'>
                            <label>Provincia</label>
                            <input name='provincia' value={form.provincia} onChange={handleChange} maxLength={50}/>
                        </div>
                        <div className='mf-group'>
                            <label>Tipo de salón</label>
                            <select name='tipo_salon' value={form.tipo_salon} onChange={handleChange}>
                                <option value=''>Sin especificar</option>
                                {['Salón', 'Quincho', 'Quinta', 'Finca', 'Bodega', 'Terraza', 'Pelotero'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className='mf-row'>
                        <div className='mf-group'>
                            <label>Aforo *</label>
                            <input type='number' name='aforo' value={form.aforo} onChange={handleChange} min='1'/>
                        </div>
                        <div className='mf-group'>
                            <label>Precio base (ARS) *</label>
                            <input type='number' name='precio_alquiler' value={form.precio_alquiler} onChange={handleChange} min='0'/>
                        </div>
                    </div>
                    <div className='mf-group'>
                        <label>URL de imagen</label>
                        <input type='url' name='imagen' value={form.imagen} onChange={handleChange} placeholder='https://'/>
                        {form.imagen && <img src={form.imagen} alt='preview' className='mf-img-preview'/>}
                    </div>
                    {error && <p className='mf-error'>{error}</p>}
                    <div className='mf-acciones'>
                        <button type='button' className='btn-cancelar-modal' onClick={onCerrar}>Cancelar</button>
                        <button type='submit' className='btn-guardar-modal' disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const MiSalonScreen = () => {
    const navigate = useNavigate()
    const [salon, setSalon] = useState(null)
    const [reservas, setReservas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [tab, setTab] = useState('info')
    const [editandoInfo, setEditandoInfo] = useState(false)

    const cargarSalon = async () => {
        const data = await getMiSalon()
        setSalon(data)
    }

    const cargarReservas = async () => {
        try {
            const data = await getMiSalonReservas()
            setReservas(data || [])
        } catch {
            setReservas([])
        }
    }

    useEffect(() => {
        const init = async () => {
            setCargando(true)
            await Promise.all([cargarSalon(), cargarReservas()])
            setCargando(false)
        }
        init()
    }, [])

    if (cargando) return (
        <div className='mi-salon-page'>
            <div className='ms-loading'>Cargando tu salón...</div>
        </div>
    )

    if (!salon) return (
        <div className='mi-salon-page'>
            <div className='ms-vacio'>
                <FiHome size={56}/>
                <h3>Todavía no registraste tu salón</h3>
                <p>Registrá tu espacio para que los organizadores puedan reservarlo.</p>
                <button className='ms-btn-primario' onClick={() => navigate('/salones/new')}>
                    Registrar mi salón
                </button>
            </div>
        </div>
    )

    return (
        <div className='mi-salon-page'>
            {/* Header */}
            <div className='ms-header'>
                <div className='ms-titulo'>
                    <FiHome size={26}/>
                    <div>
                        <h1>Mi Salón</h1>
                        <p>Gestioná tu espacio, precios y reservas</p>
                    </div>
                </div>
                {/* Contadores de reservas por estado */}
                <div className='ms-stats'>
                    {['seña_abonada', 'confirmada', 'pendiente_pago'].map(e => {
                        const count = reservas.filter(r => r.estado === e).length
                        if (count === 0) return null
                        return (
                            <div key={e} className={`ms-stat-badge ms-stat-${e}`}>
                                <span className='ms-stat-num'>{count}</span>
                                <span className='ms-stat-label'>{ESTADO_LABEL[e]}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Tabs */}
            <div className='ms-tabs'>
                {[
                    { key: 'info', label: 'Información', icon: <FiHome size={15}/> },
                    { key: 'precios', label: 'Precios', icon: <FiDollarSign size={15}/> },
                    { key: 'reservas', label: `Reservas (${reservas.filter(r=>r.estado!=='cancelada').length})`, icon: <FiCalendar size={15}/> },
                ].map(t => (
                    <button
                        key={t.key}
                        className={`ms-tab ${tab === t.key ? 'ms-tab-activa' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido del tab */}
            {tab === 'info' && (
                <TabInfo salon={salon} onEditar={() => setEditandoInfo(true)} />
            )}
            {tab === 'precios' && (
                <TabPrecios
                    salon={salon}
                    onGuardado={(config) => setSalon(prev => ({ ...prev, precios_config: JSON.stringify(config) }))}
                />
            )}
            {tab === 'reservas' && (
                <TabReservas
                    reservas={reservas}
                    onActualizar={cargarReservas}
                    nombreSalon={salon?.nombre}
                />
            )}

            {/* Modal edición info */}
            {editandoInfo && (
                <ModalEditInfo
                    salon={salon}
                    onGuardado={cargarSalon}
                    onCerrar={() => setEditandoInfo(false)}
                />
            )}
        </div>
    )
}

export default MiSalonScreen
