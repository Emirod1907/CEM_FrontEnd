import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import {
    getMisServicios,
    crearServicioProveedor,
    updateServicioProveedor,
    deleteServicioProveedor,
    getMisReservasProveedor,
    getMiAgenda,
    crearBloqueoManual,
    updateBloqueoManual,
    confirmarReservaProveedor,
    eliminarBloqueoManual
} from '../../../services/servicioServices'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiPackage,
         FiCalendar, FiChevronLeft, FiChevronRight, FiSlash, FiMapPin, FiMinus,
         FiClock, FiStar, FiUploadCloud, FiCamera } from 'react-icons/fi'
import PreciosConfigPanel from '../../PreciosConfigPanel/PreciosConfigPanel'
import ImportarExcelModal from '../../Modals/ImportarExcelModal/ImportarExcelModal'
import ContratoModal from '../../Modals/ContratoModal/ContratoModal'
import { getMiContrato } from '../../../services/contratoServices'
import MpConnectButton from '../../MpConnectButton/MpConnectButton'
import GoogleCalendarConnectButton from '../../MpConnectButton/GoogleCalendarConnectButton'
import ReservaDetalleProveedorHorizontal from './ReservaDetalleProveedorHorizontal'
import { TortaCamposForm, TortaDetalleView, tieneDatosTorta } from '../../TortaCampos/TortaCampos'
import UploadImg from '../../../services/uploadimg'
import { parsePreciosConfig } from '../../../utils/preciosUtils'
import './MisServiciosScreen.css'

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS_PRODUCTO = [
    { value: 'bebidas',     label: 'Bebidas' },
    { value: 'alimentos',   label: 'Alimentos' },
    { value: 'catering',    label: 'Catering' },
    { value: 'cotillon',    label: 'Cotillón y Souvenirs' },
    { value: 'vajilla',     label: 'Vajilla (platos, vasos, cubiertos)' },
    { value: 'otro',        label: 'Otro' }
]

const CATEGORIAS_SERVICIO = [
    { value: 'decoracion',      label: 'Decoración' },
    { value: 'audio_video',     label: 'Audio y Video' },
    { value: 'seguridad',       label: 'Seguridad' },
    { value: 'personal',        label: 'Provisión de Personal (mozos y bartenders)' },
    { value: 'mobiliario',      label: 'Mobiliario' },
    { value: 'entretenimiento', label: 'Entretenimiento' },
    { value: 'tortas',          label: 'Elaboración de Tortas' },
    { value: 'otro',            label: 'Otro' }
]

// Subcategorías por categoría (por ahora, solo alimentos: dulce / salado)
const SUBCATEGORIAS = {
    alimentos: [
        { value: 'dulce',  label: 'Dulces' },
        { value: 'salado', label: 'Salados' },
    ],
}

const TODAS_CATEGORIAS = [
    { value: 'catering',        label: 'Catering' },
    { value: 'decoracion',      label: 'Decoración' },
    { value: 'audio_video',     label: 'Audio y Video' },
    { value: 'seguridad',       label: 'Seguridad' },
    { value: 'personal',        label: 'Provisión de Personal' },
    { value: 'mobiliario',      label: 'Mobiliario' },
    { value: 'entretenimiento', label: 'Entretenimiento' },
    { value: 'tortas',          label: 'Elaboración de Tortas' },
    { value: 'bebidas',         label: 'Bebidas' },
    { value: 'comida',          label: 'Alimentos' },
    { value: 'alimentos',       label: 'Alimentos' },
    { value: 'cotillon',        label: 'Cotillón y Souvenirs' },
    { value: 'vajilla',         label: 'Vajilla' },
    { value: 'otro',            label: 'Otro' }
]

const SUBCATEGORIA_LABEL = { dulce: 'Dulces', salado: 'Salados' }

const TIPOS_PRECIO = [
    { value: 'fijo',        label: 'Precio fijo (monto único)',             sufijo: '' },
    { value: 'por_persona', label: 'Por persona (× cantidad de invitados)', sufijo: '/ persona' },
    { value: 'por_hora',    label: 'Por hora (× horas contratadas)',         sufijo: '/ hora' },
    { value: 'por_turno',   label: 'Por turno (× turnos contratados)',       sufijo: '/ turno' }
]

const TIPOS_PRECIO_PRODUCTO = TIPOS_PRECIO.filter(t => t.value === 'fijo' || t.value === 'por_persona')
const TIPOS_PRECIO_SERVICIO = TIPOS_PRECIO

const DIAS_FORM = [
    { value: 'lun', label: 'Lun' },
    { value: 'mar', label: 'Mar' },
    { value: 'mie', label: 'Mié' },
    { value: 'jue', label: 'Jue' },
    { value: 'vie', label: 'Vie' },
    { value: 'sab', label: 'Sáb' },
    { value: 'dom', label: 'Dom' }
]

const DIAS_LABEL = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' }

const FORM_VACIO = {
    nombre: '', descripcion: '', marca: '', unidad: '', ideal_para_personas: '', precio: '',
    categoria: 'catering', subcategoria: '', tipo_precio: 'fijo', tipo_item: 'producto',
    imagen: '', capacidad_maxima: '', dias_anticipacion: '0',
    dias_disponibles: [], horario_inicio: '', horario_fin: '',
    precios_tramos: {}   // objeto con fin_semana, feriado; ya no es un array
}

// Unidades de venta predefinidas (+ opción 'otro' para escribir una personalizada)
const UNIDADES_PREDEF = ['por persona', 'por unidad', 'por porción', 'por docena', 'por bandeja', 'por kg', 'por hora', 'por turno']

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

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

const ITEM_VACIO = { nombre: '', cantidad: 1, precio_unitario: '' }
const FORM_BLOQUEO_VACIO = {
    nombre_cliente: '', descripcion: '', estado: 'confirmada', bloquear_fecha: false,
    items: [{ ...ITEM_VACIO }],
    domicilio: { departamento: '', localidad: '', calle: '' },
    estado_pago: 'sin_pago', fecha_limite: '',
    torta: null,
}

// detalle_pedido puede ser el array de items (formato viejo) o { items, torta }.
// leerDetalle normaliza a { items, torta } sin romper lo existente.
const leerDetalle = (str) => {
    let parsed = []
    try { parsed = JSON.parse(str || '[]') } catch {}
    if (Array.isArray(parsed)) return { items: parsed, torta: null }
    return { items: Array.isArray(parsed.items) ? parsed.items : [], torta: parsed.torta || null }
}

const ESTADO_PAGO_LABEL = {
    sin_pago:     'Sin pago',
    seña_abonada: 'Seña abonada',
    pagado_total: 'Pagado total',
    cancelado:    'Cancelado',
}
const ESTADO_PAGO_CLASS = {
    sin_pago:     'estado-pendiente',
    seña_abonada: 'estado-sena',
    pagado_total: 'estado-confirmada',
    cancelado:    'estado-cancelada',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDias = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return [] }
}

const fmtHorario = (inicio, fin) => {
    if (!inicio && !fin) return null
    if (inicio && fin) return `${inicio} – ${fin}`
    if (inicio) return `Desde ${inicio}`
    return `Hasta ${fin}`
}

const fmtHoraFin = (horaInicio, horas) => {
    if (!horaInicio || !horas) return null
    const [h, m] = horaInicio.split(':').map(Number)
    const total = h * 60 + m + Number(horas) * 60
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ─── Calendario proveedor ────────────────────────────────────────────────────

const CalendarioProveedor = ({ reservas, agenda, mes, año, diaSeleccionado, popoverDia, onDiaClick, onAgregarBloqueo }) => {
    const primerDia = new Date(año, mes, 1)
    const totalDias = new Date(año, mes + 1, 0).getDate()
    const inicioSemana = (primerDia.getDay() + 6) % 7

    const celdas = []
    for (let i = 0; i < inicioSemana; i++) celdas.push(null)
    for (let d = 1; d <= totalDias; d++) celdas.push(d)

    const fechaStr = (dia) =>
        `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

    const reservaPorDia = (dia) =>
        reservas.find(r => r.fecha && r.fecha.startsWith(fechaStr(dia))) || null

    const agendaPorDia = (dia) =>
        agenda.find(a => a.fecha && a.fecha.startsWith(fechaStr(dia))) || null

    const hoy = new Date()
    const esPasado = (dia) => {
        if (!dia) return false
        const d = new Date(año, mes, dia); d.setHours(0,0,0,0)
        const h = new Date(); h.setHours(0,0,0,0)
        return d < h
    }

    return (
        <div className='cal-wrapper'>
            <div className='cal-header-dias'>
                {DIAS_SEMANA.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className='cal-grid'>
                {celdas.map((dia, i) => {
                    const reserva  = dia ? reservaPorDia(dia) : null
                    const bloqueo  = dia ? agendaPorDia(dia)  : null
                    const esHoy    = dia && hoy.getFullYear() === año && hoy.getMonth() === mes && hoy.getDate() === dia
                    const pasado   = esPasado(dia)
                    const libre    = dia && !reserva && !bloqueo && !pasado
                    const tienePopover = libre && dia === popoverDia
                    const estadoCelda = bloqueo
                        ? bloqueo.manual ? 'cal-bloqueado' : 'cal-externa'
                        : reserva
                            ? `cal-${reserva.agenda_estado || reserva.estado}`
                            : ''
                    return (
                        <div
                            key={i}
                            className={[
                                'cal-celda',
                                !dia ? 'cal-vacia' : '',
                                pasado ? 'cal-pasado' : '',
                                estadoCelda,
                                dia === diaSeleccionado ? 'cal-seleccionada' : '',
                                esHoy ? 'cal-hoy' : '',
                                libre ? 'cal-libre' : '',
                            ].join(' ')}
                            onClick={() => dia && !pasado && onDiaClick(dia, reserva, bloqueo)}
                        >
                            {dia && <span className='cal-num'>{dia}</span>}
                            {tienePopover && (
                                <div className='cal-popover' onClick={e => e.stopPropagation()}>
                                    <button className='cal-popover-btn' onClick={() => onAgregarBloqueo(dia)}>
                                        <FiPlus size={12}/> Agregar reserva
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className='cal-leyenda'>
                <span className='cal-leyenda-item'><span className='cal-dot cal-pendiente_pago'/>Pendiente</span>
                <span className='cal-leyenda-item'><span className='cal-dot cal-seña_abonada'/>Seña abonada</span>
                <span className='cal-leyenda-item'><span className='cal-dot cal-confirmada'/>Confirmada</span>
                <span className='cal-leyenda-item'><span className='cal-dot cal-externa'/>Externa</span>
                <span className='cal-leyenda-item'><span className='cal-dot cal-bloqueado'/>Bloqueada</span>
            </div>
        </div>
    )
}

// ─── Tab Reservas del proveedor ───────────────────────────────────────────────

const TabReservasProveedor = ({ reservas, agenda, onActualizar, servicios = [] }) => {
    const hoy = new Date()
    const [mes, setMes] = useState(hoy.getMonth())
    const [año, setAño] = useState(hoy.getFullYear())
    const [diaSeleccionado, setDiaSeleccionado] = useState(null)
    const [reservaSeleccionada, setReservaSeleccionada] = useState(null)
    const [bloqueoSeleccionado, setBloqueoSeleccionado] = useState(null)
    const [filtroEstado, setFiltroEstado] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [popoverDia, setPopoverDia] = useState(null)
    const [mostrarModalBloqueo, setMostrarModalBloqueo] = useState(false)
    const [fechaBloqueo, setFechaBloqueo] = useState(null)
    const [formBloqueo, setFormBloqueo] = useState(FORM_BLOQUEO_VACIO)
    const [editandoBloqueoId, setEditandoBloqueoId] = useState(null)
    const [guardando, setGuardando] = useState(false)
    const [confirmando, setConfirmando] = useState(null)
    const [accionando, setAccionando] = useState(false)
    const [mostrarModalCancelacion, setMostrarModalCancelacion] = useState(false)
    const [motivoCancelacion, setMotivoCancelacion] = useState({ razon: '', detalle: '' })
    const [mostrarArchivo, setMostrarArchivo] = useState(false)
    const [archivoDetalle, setArchivoDetalle] = useState(null)

    const hoyStr = new Date().toISOString().slice(0, 10)

    const reservasEnriquecidas = reservas.map(r => {
        const entradaAgenda = agenda.find(a => a.reserva_id === r.id_reserva)
        return { ...r, agenda_estado: entradaAgenda?.estado || null, id_agenda: entradaAgenda?.id_agenda || null }
    })

    const internasActivas = reservasEnriquecidas.filter(r =>
        r.fecha && String(r.fecha).slice(0,10) >= hoyStr
        && r.estado !== 'cancelada' && r.agenda_estado !== 'cancelada'
    )
    const externasActivas = agenda.filter(a =>
        !a.reserva_id && a.fecha && a.fecha.slice(0,10) >= hoyStr && a.estado_pago !== 'cancelado'
    )

    const internasArchivadas = reservasEnriquecidas.filter(r =>
        !internasActivas.find(a => a.id_reserva === r.id_reserva)
    )
    const externasArchivadas = agenda.filter(a =>
        !a.reserva_id && !externasActivas.find(e => e.id_agenda === a.id_agenda)
    )

    const totalGlobal = internasActivas.length + externasActivas.length

    const ESTADO_EXTERNO_MAP = { pendiente_pago: 'sin_pago', seña_abonada: 'seña_abonada', confirmada: 'pagado_total' }

    const listaGlobal = [
        ...(filtroTipo === 'externa' ? [] : internasActivas.filter(r => {
            if (!filtroEstado) return true
            return (r.agenda_estado || r.estado) === filtroEstado
        }).map(r => ({ ...r, _tipo: 'interna' }))),
        ...(filtroTipo === 'interna' ? [] : externasActivas.filter(a => {
            if (!filtroEstado) return true
            return a.estado_pago === (ESTADO_EXTERNO_MAP[filtroEstado] || filtroEstado)
        }).map(a => ({ ...a, _tipo: 'externa' })))
    ].sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1)

    const listaArchivo = [
        ...internasArchivadas.map(r => ({ ...r, _tipo: 'interna' })),
        ...externasArchivadas.map(a => ({ ...a, _tipo: 'externa' }))
    ].sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1)

    const cerrarTodo = () => {
        setDiaSeleccionado(null); setReservaSeleccionada(null); setBloqueoSeleccionado(null)
        setPopoverDia(null); setConfirmando(null)
    }

    const mesAnterior = () => {
        if (mes === 0) { setMes(11); setAño(a => a - 1) } else setMes(m => m - 1)
        cerrarTodo()
    }
    const mesSiguiente = () => {
        if (mes === 11) { setMes(0); setAño(a => a + 1) } else setMes(m => m + 1)
        cerrarTodo()
    }

    const onDiaClick = (dia, reserva, bloqueo) => {
        if (diaSeleccionado === dia && !reserva && !bloqueo) { cerrarTodo(); return }
        if (diaSeleccionado === dia && (reservaSeleccionada || bloqueoSeleccionado)) { cerrarTodo(); return }
        setDiaSeleccionado(dia)
        setConfirmando(null)
        if (bloqueo) {
            setBloqueoSeleccionado(bloqueo); setReservaSeleccionada(null); setPopoverDia(null)
        } else if (reserva) {
            setReservaSeleccionada(reserva); setBloqueoSeleccionado(null); setPopoverDia(null)
        } else {
            setReservaSeleccionada(null); setBloqueoSeleccionado(null); setPopoverDia(dia)
        }
    }

    const abrirModalBloqueo = (dia) => {
        const f = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        setFechaBloqueo(f); setFormBloqueo(FORM_BLOQUEO_VACIO); setEditandoBloqueoId(null); setPopoverDia(null); setMostrarModalBloqueo(true)
    }

    const editarBloqueo = (b) => {
        const { items, torta } = leerDetalle(b.detalle_pedido)
        let domicilio = { departamento: '', localidad: '', calle: '' }
        try { domicilio = { ...domicilio, ...JSON.parse(b.domicilio || '{}') } } catch {}
        setFechaBloqueo(b.fecha)
        setEditandoBloqueoId(b.id_agenda)
        setFormBloqueo({
            nombre_cliente: b.nombre_cliente || '',
            descripcion:    b.descripcion    || '',
            estado:         b.estado         || 'confirmada',
            bloquear_fecha: !!b.manual,
            items:          items.length > 0 ? items : [{ ...ITEM_VACIO }],
            domicilio,
            estado_pago:    b.estado_pago    || 'sin_pago',
            fecha_limite:   b.fecha_limite   ? b.fecha_limite.slice(0, 10) : '',
            torta,
        })
        setMostrarModalBloqueo(true)
    }

    const calcularTotal = (items) =>
        (Array.isArray(items) ? items : []).reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0)

    const guardarBloqueo = async (e) => {
        e.preventDefault()
        setGuardando(true)
        try {
            const { bloquear_fecha, items, domicilio, torta, ...resto } = formBloqueo
            const itemsValidos = (items || []).filter(it => it.nombre.trim())
            const monto_total = calcularTotal(itemsValidos)
            // Si hay requisitos de torta, se guarda { items, torta }; si no, solo el array (compatibilidad)
            const detalle = tieneDatosTorta(torta) ? { items: itemsValidos, torta } : itemsValidos
            const payload = {
                ...resto,
                bloquear_fecha,
                detalle_pedido: JSON.stringify(detalle),
                monto_total: monto_total || null,
                domicilio: JSON.stringify(domicilio || {}),
            }
            if (editandoBloqueoId) {
                await updateBloqueoManual(editandoBloqueoId, payload)
            } else {
                await crearBloqueoManual({ fecha: fechaBloqueo, ...payload })
            }
            await onActualizar(); setMostrarModalBloqueo(false); setEditandoBloqueoId(null); cerrarTodo()
        } catch (err) {
            console.error(err)
        } finally { setGuardando(false) }
    }

    const handleConfirmarReserva = async (estado, motivo = null) => {
        setAccionando(true)
        try {
            await confirmarReservaProveedor(reservaSeleccionada.id_reserva, estado, motivo)
            await onActualizar()
            setConfirmando(null)
            setMostrarModalCancelacion(false)
            setMotivoCancelacion({ razon: '', detalle: '' })
            setReservaSeleccionada(prev => ({ ...prev, agenda_estado: estado }))
        } catch (err) { console.error(err) }
        finally { setAccionando(false) }
    }

    const abrirModalCancelacion = () => {
        setMotivoCancelacion({ razon: '', detalle: '' })
        setMostrarModalCancelacion(true)
    }

    const enviarCancelacion = (e) => {
        e.preventDefault()
        const texto = [motivoCancelacion.razon, motivoCancelacion.detalle].filter(Boolean).join(' — ')
        handleConfirmarReserva('cancelada', texto || null)
    }

    const handleEliminarBloqueo = async () => {
        try {
            await eliminarBloqueoManual(bloqueoSeleccionado.id_agenda)
            await onActualizar(); cerrarTodo()
        } catch (err) { console.error(err) }
    }

    const fechaDisplay = (f) => new Date(f).toLocaleDateString('es-AR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    })

    const estadoAgenda = reservaSeleccionada?.agenda_estado
    const estadoMostrado = estadoAgenda || reservaSeleccionada?.estado
    const ESTADO_AGENDA_LABEL = { pendiente: 'Pendiente', confirmada: 'Confirmada por vos', cancelada: 'Cancelada por vos' }

    // Renderiza detalle de servicio con hora si aplica
    const renderServicioContratado = (s, i) => {
        const tieneHoraPorHora = s.tipo_precio === 'por_hora' && s.hora_inicio
        const horaFin = tieneHoraPorHora ? fmtHoraFin(s.hora_inicio, s.horas || 1) : null
        return (
            <li key={i} className='servicio-contratado-item'>
                <span className='sc-nombre'>{s.nombre}</span>
                {tieneHoraPorHora ? (
                    <span className='sc-horario'>
                        <FiClock size={11}/> {s.hora_inicio}{horaFin ? ` – ${horaFin}` : ''}
                        {s.horas ? ` (${s.horas}h)` : ''}
                    </span>
                ) : s.hora_inicio ? (
                    <span className='sc-horario'>
                        <FiClock size={11}/> {s.tipo_item === 'servicio' ? 'Inicio' : 'Entrega'}: {s.hora_inicio}
                    </span>
                ) : null}
                <span className='sc-precio'>${Number(s.precio || 0).toLocaleString('es-AR')}</span>
            </li>
        )
    }

    return (
        <div className='tab-reservas'>
            {/* Detalle horizontal arriba (al tocar una reserva interna) */}
            {reservaSeleccionada && (
                <ReservaDetalleProveedorHorizontal
                    reserva={reservaSeleccionada}
                    estadoAgenda={estadoAgenda}
                    estadoMostrado={estadoMostrado}
                    onCerrar={cerrarTodo}
                    onConfirmar={() => { if (window.confirm('¿Confirmás la solicitud para este evento?')) handleConfirmarReserva('confirmada') }}
                    onCancelar={abrirModalCancelacion}
                    accionando={accionando}
                />
            )}

            <div className={`reservas-layout ${reservaSeleccionada ? 'reservas-layout--con-detalle' : ''}`}>

                {/* Columna izquierda: lista */}
                <div className='reservas-col-izq'>
                    <div className='reservas-lista-header'>
                        <div className='reservas-contadores'>
                            <span className='reservas-lista-titulo'>
                                Todas las reservas
                                <span className='reservas-lista-count'>{totalGlobal}</span>
                            </span>
                            <span className='reservas-lista-titulo reservas-lista-titulo--sub'>
                                Reservas
                                <span className='reservas-lista-count reservas-lista-count--filtrado'>{listaGlobal.length}</span>
                            </span>
                        </div>
                        <div className='filtros-group'>
                            <select className='filtro-estado-select' value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                                <option value=''>Todas</option>
                                <option value='interna'>Internas</option>
                                <option value='externa'>Externas</option>
                            </select>
                            <select className='filtro-estado-select' value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                                <option value=''>Todos los estados</option>
                                <option value='pendiente_pago'>Sin pago / Pendiente</option>
                                <option value='seña_abonada'>Seña abonada</option>
                                <option value='confirmada'>Confirmada / Pago total</option>
                            </select>
                            <button className='btn-archivo' onClick={() => setMostrarArchivo(true)}>
                                Archivo {listaArchivo.length > 0 && <span className='archivo-badge'>{listaArchivo.length}</span>}
                            </button>
                        </div>
                    </div>

                    {listaGlobal.length === 0 ? (
                        <p className='reservas-vacio'>No hay reservas.</p>
                    ) : (
                        <div className='reservas-lista reservas-lista--global'>
                            {listaGlobal.map((item, idx) => {
                                const esInterna = item._tipo === 'interna'
                                const activa = esInterna
                                    ? item.id_reserva === reservaSeleccionada?.id_reserva
                                    : item.id_agenda === bloqueoSeleccionado?.id_agenda
                                const handleClick = () => {
                                    const f = new Date(item.fecha)
                                    setMes(f.getUTCMonth()); setAño(f.getUTCFullYear())
                                    setDiaSeleccionado(f.getUTCDate()); setPopoverDia(null); setConfirmando(null)
                                    if (esInterna) {
                                        setReservaSeleccionada(item); setBloqueoSeleccionado(null)
                                    } else {
                                        setBloqueoSeleccionado(item); setReservaSeleccionada(null)
                                    }
                                }
                                return (
                                    <div
                                        key={esInterna ? `r-${item.id_reserva}` : `a-${item.id_agenda}-${idx}`}
                                        className={`reserva-item ${!esInterna ? 'reserva-item--externa' : ''} ${activa ? 'reserva-item-activa' : ''}`}
                                        onClick={handleClick}
                                    >
                                        <div className='reserva-item-left'>
                                            <div className='reserva-item-fecha-col'>
                                                <span className='reserva-item-fecha'>
                                                    {new Date(item.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                                                </span>
                                                <span className='reserva-item-anio'>
                                                    {new Date(item.fecha).toLocaleDateString('es-AR', { year: 'numeric', timeZone: 'UTC' })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className='reserva-item-nombre'>
                                                    {esInterna
                                                        ? (`${item.Persona?.nombre || ''} ${item.Persona?.apellido || ''}`.trim() || item.Persona?.nombre_usuario || 'Organizador')
                                                        : (item.nombre_cliente || 'Sin nombre')}
                                                </span>
                                                <span className='reserva-item-email'>
                                                    {esInterna
                                                        ? (item.Salon?.nombre || '')
                                                        : (item.manual ? 'Fecha bloqueada' : 'Reserva externa')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='reserva-item-right'>
                                            <span className={`tipo-pill ${esInterna ? 'tipo-interna' : 'tipo-externa'}`}>
                                                {esInterna ? 'Interna' : 'Externa'}
                                            </span>
                                            <span className={`estado-badge ${esInterna
                                                ? ESTADO_CLASS[item.agenda_estado === 'pendiente' ? 'pendiente_pago' : (item.agenda_estado || item.estado)]
                                                : ESTADO_PAGO_CLASS[item.estado_pago || 'sin_pago']}`}>
                                                {esInterna
                                                    ? (item.agenda_estado ? ESTADO_AGENDA_LABEL[item.agenda_estado] : ESTADO_LABEL[item.estado])
                                                    : ESTADO_PAGO_LABEL[item.estado_pago || 'sin_pago']}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Panel detalle reserva de plataforma */}
                    {/* Detalle vertical reemplazado por ReservaDetalleProveedorHorizontal (arriba) */}
                    {false && reservaSeleccionada && (
                        <div className='reserva-detalle-panel'>
                            <div className='reserva-detalle-header'>
                                <h4>Detalle de reserva</h4>
                                <button className='btn-cerrar-detalle' onClick={cerrarTodo}><FiX size={18}/></button>
                            </div>
                            <div className='reserva-detalle-body'>
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Organizador</span>
                                    <span>{`${reservaSeleccionada.Persona?.nombre || ''} ${reservaSeleccionada.Persona?.apellido || ''}`.trim() || '—'}</span>
                                </div>
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Email</span>
                                    <span>{reservaSeleccionada.Persona?.email || '—'}</span>
                                </div>
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Salón</span>
                                    <span>{reservaSeleccionada.Salon?.nombre || '—'}</span>
                                </div>
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Fecha</span>
                                    <span>{fechaDisplay(reservaSeleccionada.fecha)}</span>
                                </div>
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Estado salón</span>
                                    <span className={`estado-badge ${ESTADO_CLASS[reservaSeleccionada.estado]}`}>{ESTADO_LABEL[reservaSeleccionada.estado]}</span>
                                </div>
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Tu confirmación</span>
                                    <span className={`estado-badge ${estadoAgenda ? ESTADO_CLASS[estadoAgenda === 'pendiente' ? 'pendiente_pago' : estadoAgenda] : 'estado-pendiente'}`}>
                                        {estadoAgenda ? ESTADO_AGENDA_LABEL[estadoAgenda] : 'Sin confirmar'}
                                    </span>
                                </div>
                                {reservaSeleccionada.datos_evento?.tipoEvento && (
                                    <div className='reserva-dato-row'>
                                        <span className='reserva-dato-label'>Tipo de evento</span>
                                        <span>{reservaSeleccionada.datos_evento.tipoEvento}</span>
                                    </div>
                                )}
                                {reservaSeleccionada.datos_evento?.numInvitados && (
                                    <div className='reserva-dato-row'>
                                        <span className='reserva-dato-label'>Invitados</span>
                                        <span>{reservaSeleccionada.datos_evento.numInvitados}</span>
                                    </div>
                                )}
                                {reservaSeleccionada.mis_servicios?.length > 0 && (
                                    <div className='reserva-dato-row reserva-dato-full'>
                                        <span className='reserva-dato-label'>Mis servicios contratados</span>
                                        <ul className='mis-servicios-contratados'>
                                            {reservaSeleccionada.mis_servicios.map(renderServicioContratado)}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className='reserva-acciones'>
                                {confirmando === 'confirmar' ? (
                                    <div className='confirm-overlay'>
                                        <p>¿Confirmás la solicitud para este evento?</p>
                                        <div className='confirm-btns'>
                                            <button className='btn-accion btn-confirmar' onClick={() => handleConfirmarReserva('confirmada')} disabled={accionando}>
                                                {accionando ? '...' : <><FiCheck size={14}/> Sí, confirmar</>}
                                            </button>
                                            <button className='btn-accion btn-cancelar-accion' onClick={() => setConfirmando(null)}>No</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {estadoMostrado !== 'confirmada' && (
                                            <button className='btn-accion btn-confirmar' onClick={() => setConfirmando('confirmar')}>
                                                <FiCheck size={15}/> Confirmar solicitud
                                            </button>
                                        )}
                                        {estadoMostrado !== 'cancelada' && (
                                            <button className='btn-accion btn-rechazar' onClick={abrirModalCancelacion}>
                                                <FiSlash size={15}/> Cancelar solicitud
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Panel detalle reserva externa / bloqueo */}
                    {bloqueoSeleccionado && (
                        <div className='reserva-detalle-panel'>
                            <div className='reserva-detalle-header'>
                                <h4>{bloqueoSeleccionado.manual ? 'Reserva externa (fecha bloqueada)' : 'Reserva externa'}</h4>
                                <button className='btn-cerrar-detalle' onClick={cerrarTodo}><FiX size={18}/></button>
                            </div>
                            <div className='reserva-detalle-body'>
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Fecha</span>
                                    <span>{fechaDisplay(bloqueoSeleccionado.fecha)}</span>
                                </div>
                                {bloqueoSeleccionado.nombre_cliente && (
                                    <div className='reserva-dato-row'>
                                        <span className='reserva-dato-label'>Cliente</span>
                                        <span>{bloqueoSeleccionado.nombre_cliente}</span>
                                    </div>
                                )}
                                {(() => {
                                    let dom = {}
                                    try { dom = JSON.parse(bloqueoSeleccionado.domicilio || '{}') } catch {}
                                    const partes = [dom.calle, dom.localidad, dom.departamento].filter(Boolean)
                                    return partes.length > 0 ? (
                                        <div className='reserva-dato-row'>
                                            <span className='reserva-dato-label'><FiMapPin size={12}/> Dirección</span>
                                            <span>{partes.join(', ')}</span>
                                        </div>
                                    ) : null
                                })()}
                                {(() => {
                                    const { items, torta } = leerDetalle(bloqueoSeleccionado.detalle_pedido)
                                    const total = items.reduce((a, it) => a + (Number(it.cantidad)||0)*(Number(it.precio_unitario)||0), 0)
                                    if (items.length === 0 && !tieneDatosTorta(torta)) return null
                                    return (
                                        <>
                                            {items.length > 0 && (
                                                <div className='carrito-detalle'>
                                                    <span className='reserva-dato-label'>Pedido</span>
                                                    <div className='carrito-items'>
                                                        {items.map((it, i) => {
                                                            const subtotal = (Number(it.cantidad)||0) * (Number(it.precio_unitario)||0)
                                                            return (
                                                                <div key={i} className='carrito-item'>
                                                                    <div className='carrito-item-icon'><FiPackage size={18}/></div>
                                                                    <div className='carrito-item-info'>
                                                                        <span className='carrito-item-nombre'>{it.nombre}</span>
                                                                        <span className='carrito-item-detalle'>{it.cantidad} × ${Number(it.precio_unitario||0).toLocaleString('es-AR')}</span>
                                                                    </div>
                                                                    <span className='carrito-item-subtotal'>${subtotal.toLocaleString('es-AR')}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    <div className='carrito-total'>
                                                        <span>Total</span>
                                                        <strong>${total.toLocaleString('es-AR')}</strong>
                                                    </div>
                                                </div>
                                            )}
                                            {tieneDatosTorta(torta) && <TortaDetalleView detalle={torta} />}
                                        </>
                                    )
                                })()}
                                <div className='reserva-dato-row'>
                                    <span className='reserva-dato-label'>Estado de pago</span>
                                    <span className={`estado-badge ${ESTADO_PAGO_CLASS[bloqueoSeleccionado.estado_pago || 'sin_pago']}`}>
                                        {ESTADO_PAGO_LABEL[bloqueoSeleccionado.estado_pago || 'sin_pago']}
                                    </span>
                                </div>
                                {bloqueoSeleccionado.fecha_limite && (
                                    <div className='reserva-dato-row'>
                                        <span className='reserva-dato-label'>Límite pago / cancelación</span>
                                        <span>{new Date(bloqueoSeleccionado.fecha_limite).toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })}</span>
                                    </div>
                                )}
                                {bloqueoSeleccionado.descripcion && (
                                    <div className='reserva-dato-row reserva-dato-full'>
                                        <span className='reserva-dato-label'>Notas</span>
                                        <span>{bloqueoSeleccionado.descripcion}</span>
                                    </div>
                                )}
                            </div>
                            <div className='reserva-acciones'>
                                <button className='btn-accion btn-confirmar' onClick={() => editarBloqueo(bloqueoSeleccionado)}>
                                    <FiEdit2 size={14}/> Editar
                                </button>
                                <button className='btn-accion btn-rechazar' onClick={handleEliminarBloqueo}>
                                    <FiTrash2 size={14}/> Eliminar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Columna derecha: calendario */}
                <div className='reservas-col-der'>
                    <div className='mes-nav'>
                        <button className='mes-btn' onClick={mesAnterior}><FiChevronLeft size={18}/></button>
                        <span className='mes-titulo'>{MESES[mes]} {año}</span>
                        <button className='mes-btn' onClick={mesSiguiente}><FiChevronRight size={18}/></button>
                    </div>
                    <CalendarioProveedor
                        reservas={reservasEnriquecidas}
                        agenda={agenda}
                        mes={mes}
                        año={año}
                        diaSeleccionado={diaSeleccionado}
                        popoverDia={popoverDia}
                        onDiaClick={onDiaClick}
                        onAgregarBloqueo={abrirModalBloqueo}
                    />
                </div>
            </div>

            {/* Modal Archivo */}
            {mostrarArchivo && (
                <div className='form-overlay' onClick={() => setMostrarArchivo(false)}>
                    <div className='modal-global' onClick={e => e.stopPropagation()}>
                        <div className='form-modal-header'>
                            <div>
                                <h2>Archivo</h2>
                                <span style={{fontSize:'0.82rem', color:'rgba(255,255,255,0.55)'}}>
                                    Reservas pasadas y canceladas · {listaArchivo.length} en total
                                </span>
                            </div>
                            <button className='btn-cerrar-form' onClick={() => setMostrarArchivo(false)}><FiX size={20}/></button>
                        </div>
                        <div className='modal-global-lista'>
                            {listaArchivo.length === 0 ? (
                                <p className='modal-global-vacio'>No hay reservas archivadas.</p>
                            ) : listaArchivo.map((item, i) => {
                                const esInterna = item._tipo === 'interna'
                                const esCancelada = esInterna
                                    ? (item.estado === 'cancelada' || item.agenda_estado === 'cancelada')
                                    : item.estado_pago === 'cancelado'
                                return (
                                    <div key={i} className={`modal-global-item modal-global-item--clickable ${esCancelada ? 'archivo-item--cancelado' : ''}`} onClick={() => setArchivoDetalle(item)}>
                                        <div className='modal-global-fecha'>
                                            <span className='modal-global-dia'>
                                                {new Date(item.fecha).toLocaleDateString('es-AR', { day:'2-digit', month:'short', timeZone:'UTC' })}
                                            </span>
                                            <span className='modal-global-anio'>
                                                {new Date(item.fecha).toLocaleDateString('es-AR', { year:'numeric', timeZone:'UTC' })}
                                            </span>
                                        </div>
                                        <div className='modal-global-info'>
                                            <span className='modal-global-nombre'>
                                                {esInterna
                                                    ? (`${item.Persona?.nombre || ''} ${item.Persona?.apellido || ''}`.trim() || item.Persona?.nombre_usuario || 'Organizador')
                                                    : (item.nombre_cliente || 'Sin nombre')}
                                            </span>
                                            <span className='modal-global-sub'>
                                                {esCancelada ? '🚫 Cancelada' : '📅 Pasada'}
                                                {esInterna && item.Salon?.nombre ? ` · ${item.Salon.nombre}` : ''}
                                                {!esInterna && (item.manual ? ' · Fecha bloqueada' : ' · Reserva externa')}
                                            </span>
                                        </div>
                                        <div className='modal-global-badges'>
                                            <span className={`tipo-pill ${esInterna ? 'tipo-interna' : 'tipo-externa'}`}>
                                                {esInterna ? 'Interna' : 'Externa'}
                                            </span>
                                            <span className={`estado-badge ${esInterna
                                                ? ESTADO_CLASS[item.agenda_estado === 'pendiente' ? 'pendiente_pago' : (item.agenda_estado || item.estado)]
                                                : ESTADO_PAGO_CLASS[item.estado_pago || 'sin_pago']}`}>
                                                {esInterna
                                                    ? (item.agenda_estado ? ESTADO_AGENDA_LABEL[item.agenda_estado] : ESTADO_LABEL[item.estado])
                                                    : ESTADO_PAGO_LABEL[item.estado_pago || 'sin_pago']}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {archivoDetalle && (() => {
                            const d = archivoDetalle
                            const esInterna = d._tipo === 'interna'
                            const estadoAg = d.agenda_estado
                            let domicilio = {}
                            let itemsPedido = []
                            let tortaPedido = null
                            if (!esInterna) {
                                try { domicilio = JSON.parse(d.domicilio || '{}') } catch {}
                                const det = leerDetalle(d.detalle_pedido); itemsPedido = det.items; tortaPedido = det.torta
                            }
                            const totalPedido = itemsPedido.reduce((a, it) => a + (Number(it.cantidad)||0)*(Number(it.precio_unitario)||0), 0)
                            return (
                                <div className='archivo-detalle-overlay' onClick={() => setArchivoDetalle(null)}>
                                    <div className='archivo-detalle-modal' onClick={e => e.stopPropagation()}>
                                        <div className='archivo-detalle-header'>
                                            <div>
                                                <h3>{esInterna ? 'Reserva de plataforma' : (d.manual ? 'Reserva externa (fecha bloqueada)' : 'Reserva externa')}</h3>
                                                <span className='archivo-detalle-fecha'>{fechaDisplay(d.fecha)}</span>
                                            </div>
                                            <button className='btn-cerrar-detalle' onClick={() => setArchivoDetalle(null)}><FiX size={18}/></button>
                                        </div>
                                        <div className='archivo-detalle-body'>
                                            {esInterna ? (
                                                <>
                                                    <div className='reserva-dato-row'><span className='reserva-dato-label'>Organizador</span><span>{`${d.Persona?.nombre || ''} ${d.Persona?.apellido || ''}`.trim() || '—'}</span></div>
                                                    <div className='reserva-dato-row'><span className='reserva-dato-label'>Email</span><span>{d.Persona?.email || '—'}</span></div>
                                                    <div className='reserva-dato-row'><span className='reserva-dato-label'>Salón</span><span>{d.Salon?.nombre || '—'}</span></div>
                                                    <div className='reserva-dato-row'><span className='reserva-dato-label'>Estado salón</span><span className={`estado-badge ${ESTADO_CLASS[d.estado]}`}>{ESTADO_LABEL[d.estado]}</span></div>
                                                    <div className='reserva-dato-row'><span className='reserva-dato-label'>Tu confirmación</span><span className={`estado-badge ${estadoAg ? ESTADO_CLASS[estadoAg === 'pendiente' ? 'pendiente_pago' : estadoAg] : 'estado-pendiente'}`}>{estadoAg ? ESTADO_AGENDA_LABEL[estadoAg] : 'Sin confirmar'}</span></div>
                                                    {d.datos_evento?.tipoEvento && <div className='reserva-dato-row'><span className='reserva-dato-label'>Tipo de evento</span><span>{d.datos_evento.tipoEvento}</span></div>}
                                                    {d.datos_evento?.numInvitados && <div className='reserva-dato-row'><span className='reserva-dato-label'>Invitados</span><span>{d.datos_evento.numInvitados}</span></div>}
                                                    {d.mis_servicios?.length > 0 && (
                                                        <div className='reserva-dato-row reserva-dato-full'>
                                                            <span className='reserva-dato-label'>Mis servicios contratados</span>
                                                            <ul className='mis-servicios-contratados'>
                                                                {d.mis_servicios.map(renderServicioContratado)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {d.nombre_cliente && <div className='reserva-dato-row'><span className='reserva-dato-label'>Cliente</span><span>{d.nombre_cliente}</span></div>}
                                                    {[domicilio.calle, domicilio.localidad, domicilio.departamento].filter(Boolean).length > 0 && (
                                                        <div className='reserva-dato-row'><span className='reserva-dato-label'><FiMapPin size={12}/> Dirección</span><span>{[domicilio.calle, domicilio.localidad, domicilio.departamento].filter(Boolean).join(', ')}</span></div>
                                                    )}
                                                    {itemsPedido.length > 0 && (
                                                        <div className='carrito-detalle'>
                                                            <span className='reserva-dato-label'>Pedido</span>
                                                            <div className='carrito-items'>
                                                                {itemsPedido.map((it, i) => {
                                                                    const sub = (Number(it.cantidad)||0)*(Number(it.precio_unitario)||0)
                                                                    return (
                                                                        <div key={i} className='carrito-item'>
                                                                            <div className='carrito-item-icon'><FiPackage size={18}/></div>
                                                                            <div className='carrito-item-info'>
                                                                                <span className='carrito-item-nombre'>{it.nombre}</span>
                                                                                <span className='carrito-item-detalle'>{it.cantidad} × ${Number(it.precio_unitario||0).toLocaleString('es-AR')}</span>
                                                                            </div>
                                                                            <span className='carrito-item-subtotal'>${sub.toLocaleString('es-AR')}</span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                            <div className='carrito-total'><span>Total</span><strong>${totalPedido.toLocaleString('es-AR')}</strong></div>
                                                        </div>
                                                    )}
                                                    {tieneDatosTorta(tortaPedido) && <TortaDetalleView detalle={tortaPedido} />}
                                                    <div className='reserva-dato-row'><span className='reserva-dato-label'>Estado de pago</span><span className={`estado-badge ${ESTADO_PAGO_CLASS[d.estado_pago || 'sin_pago']}`}>{ESTADO_PAGO_LABEL[d.estado_pago || 'sin_pago']}</span></div>
                                                    {d.fecha_limite && <div className='reserva-dato-row'><span className='reserva-dato-label'>Límite pago / cancelación</span><span>{new Date(d.fecha_limite).toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })}</span></div>}
                                                    {d.descripcion && <div className='reserva-dato-row reserva-dato-full'><span className='reserva-dato-label'>Notas</span><span>{d.descripcion}</span></div>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* Modal cancelación */}
            {mostrarModalCancelacion && (
                <div className='form-overlay' onClick={() => setMostrarModalCancelacion(false)}>
                    <div className='form-modal' onClick={e => e.stopPropagation()}>
                        <div className='form-modal-header'>
                            <div>
                                <h2>Cancelar solicitud</h2>
                                <span style={{fontSize:'0.82rem', color:'rgba(255,255,255,0.5)'}}>Informá al organizador el motivo del rechazo</span>
                            </div>
                            <button className='btn-cerrar-form' onClick={() => setMostrarModalCancelacion(false)}><FiX size={20}/></button>
                        </div>
                        <form onSubmit={enviarCancelacion} className='form-tienda'>
                            <div className='form-group'>
                                <label>Motivo principal</label>
                                <div className='cancelacion-razones'>
                                    {['Falta de stock','Reserva previa por otro medio — límite de abastecimiento alcanzado','Compromiso previo en esa fecha','El servicio no está disponible en esa zona','Otro'].map(razon => (
                                        <label key={razon} className={`razon-opcion ${motivoCancelacion.razon === razon ? 'razon-activa' : ''}`}>
                                            <input type='radio' name='razon' value={razon} checked={motivoCancelacion.razon === razon} onChange={() => setMotivoCancelacion(p => ({ ...p, razon }))}/>
                                            {razon}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className='form-group'>
                                <label>Detalle adicional (opcional)</label>
                                <textarea value={motivoCancelacion.detalle} onChange={e => setMotivoCancelacion(p => ({ ...p, detalle: e.target.value }))} placeholder='Podés agregar más información para el organizador...' rows={3} maxLength={500}/>
                            </div>
                            <div className='form-acciones'>
                                <button type='button' className='btn-cancelar' onClick={() => setMostrarModalCancelacion(false)}>Volver</button>
                                <button type='submit' className='btn-rechazar-modal' disabled={accionando || !motivoCancelacion.razon}>
                                    {accionando ? 'Enviando...' : <><FiSlash size={14}/> Confirmar cancelación</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal bloqueo manual */}
            {mostrarModalBloqueo && (
                <div className='form-overlay' onClick={() => setMostrarModalBloqueo(false)}>
                    <div className='form-modal' onClick={e => e.stopPropagation()}>
                        <div className='form-modal-header'>
                            <div>
                                <h2>{editandoBloqueoId ? 'Editar reserva externa' : 'Agregar reserva externa'}</h2>
                                <span style={{fontSize:'0.82rem', color:'rgba(255,255,255,0.5)'}}>
                                    {fechaBloqueo && new Date(fechaBloqueo).toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long', timeZone:'UTC' })}
                                </span>
                            </div>
                            <button className='btn-cerrar-form' onClick={() => setMostrarModalBloqueo(false)}><FiX size={20}/></button>
                        </div>
                        <form onSubmit={guardarBloqueo} className='form-tienda'>
                            <div className='form-group'>
                                <label>Nombre del cliente</label>
                                <input type='text' value={formBloqueo.nombre_cliente} onChange={e => setFormBloqueo(p => ({...p, nombre_cliente: e.target.value}))} placeholder='Ej: Juan Pérez' maxLength={100}/>
                            </div>
                            <div className='form-seccion-titulo'><FiMapPin size={12}/> Dirección del evento</div>
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label>Departamento</label>
                                    <input type='text' value={formBloqueo.domicilio?.departamento || ''} onChange={e => setFormBloqueo(p => ({...p, domicilio: {...(p.domicilio||{}), departamento: e.target.value}}))} placeholder='Ej: Mendoza'/>
                                </div>
                                <div className='form-group'>
                                    <label>Localidad</label>
                                    <input type='text' value={formBloqueo.domicilio?.localidad || ''} onChange={e => setFormBloqueo(p => ({...p, domicilio: {...(p.domicilio||{}), localidad: e.target.value}}))} placeholder='Ej: Godoy Cruz'/>
                                </div>
                            </div>
                            <div className='form-group'>
                                <label>Calle y número</label>
                                <input type='text' value={formBloqueo.domicilio?.calle || ''} onChange={e => setFormBloqueo(p => ({...p, domicilio: {...(p.domicilio||{}), calle: e.target.value}}))} placeholder='Ej: Belgrano 1234'/>
                            </div>
                            <div className='form-seccion-titulo'>Items del pedido</div>
                            {servicios.filter(s => s.disponible).length > 0 && (
                                <div className='tienda-catalogo'>
                                    {servicios.filter(s => s.disponible).map(s => {
                                        const enCarrito = (formBloqueo.items || []).some(it => it.id_servicio === s.id_servicio)
                                        return (
                                            <button key={s.id_servicio} type='button' className={`catalogo-item ${enCarrito ? 'catalogo-item--activo' : ''}`}
                                                onClick={() => {
                                                    if (enCarrito) return
                                                    setFormBloqueo(p => ({
                                                        ...p,
                                                        items: [...(p.items||[]).filter(it => it.nombre), {
                                                            id_servicio: s.id_servicio, nombre: s.nombre, cantidad: 1, precio_unitario: s.precio
                                                        }]
                                                    }))
                                                }}>
                                                {enCarrito && <FiCheck size={11}/>}
                                                <span>{s.nombre}</span>
                                                <span className='catalogo-item-precio'>${Number(s.precio).toLocaleString('es-AR')}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {(formBloqueo.items || []).length > 0 && (
                                <div className='carrito-editable'>
                                    {(formBloqueo.items || []).map((item, idx) => (
                                        <div key={idx} className='carrito-editable-item'>
                                            <div className='carrito-editable-icon'><FiPackage size={15}/></div>
                                            <div className='carrito-editable-info'>
                                                <span className='carrito-editable-nombre'>{item.nombre}</span>
                                                <div className='carrito-editable-controls'>
                                                    <label>Cant.</label>
                                                    <input type='number' min='1' value={item.cantidad} onChange={e => setFormBloqueo(p => { const its = [...p.items]; its[idx] = {...its[idx], cantidad: e.target.value}; return {...p, items: its} })}/>
                                                    <label>Precio unit.</label>
                                                    <input type='number' min='0' step='0.01' value={item.precio_unitario} onChange={e => setFormBloqueo(p => { const its = [...p.items]; its[idx] = {...its[idx], precio_unitario: e.target.value}; return {...p, items: its} })}/>
                                                </div>
                                            </div>
                                            <div className='carrito-editable-right'>
                                                <span className='carrito-editable-subtotal'>${((Number(item.cantidad)||0)*(Number(item.precio_unitario)||0)).toLocaleString('es-AR')}</span>
                                                <button type='button' className='item-btn-quitar' onClick={() => setFormBloqueo(p => ({...p, items: p.items.filter((_,i) => i !== idx)}))}>
                                                    <FiMinus size={12}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className='carrito-editable-total'><span>Total</span><strong>${calcularTotal(formBloqueo.items).toLocaleString('es-AR')}</strong></div>
                                </div>
                            )}
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label>Estado de pago</label>
                                    <select value={formBloqueo.estado_pago} onChange={e => setFormBloqueo(p => ({...p, estado_pago: e.target.value}))}>
                                        <option value='sin_pago'>Sin pago aún</option>
                                        <option value='seña_abonada'>Seña abonada</option>
                                        <option value='pagado_total'>Pagado total</option>
                                        <option value='cancelado'>Cancelado</option>
                                    </select>
                                </div>
                                <div className='form-group'>
                                    <label>Fecha límite de pago / cancelación</label>
                                    <input type='date' value={formBloqueo.fecha_limite} onChange={e => setFormBloqueo(p => ({...p, fecha_limite: e.target.value}))}/>
                                </div>
                            </div>
                            <div className='form-group'>
                                <label>Notas internas (opcional)</label>
                                <textarea value={formBloqueo.descripcion} onChange={e => setFormBloqueo(p => ({...p, descripcion: e.target.value}))} placeholder='Observaciones adicionales...' rows={2} maxLength={500}/>
                            </div>

                            {/* Requisitos de torta (opcional) — para pedidos de repostería tomados a mano */}
                            <details className='bloqueo-torta' open={tieneDatosTorta(formBloqueo.torta)}>
                                <summary>🎂 Requisitos de torta (opcional)</summary>
                                <div className='bloqueo-torta-body'>
                                    <TortaCamposForm
                                        value={formBloqueo.torta}
                                        onChange={(t) => setFormBloqueo(p => ({ ...p, torta: t }))}
                                    />
                                </div>
                            </details>

                            <label className='bloqueo-toggle-label'>
                                <input type='checkbox' checked={formBloqueo.bloquear_fecha} onChange={e => setFormBloqueo(p => ({...p, bloquear_fecha: e.target.checked}))}/>
                                <span>Bloquear esta fecha (no aceptar más reservas ese día)</span>
                            </label>
                            <div className='form-acciones'>
                                <button type='button' className='btn-cancelar' onClick={() => setMostrarModalBloqueo(false)}>Cancelar</button>
                                <button type='submit' className='btn-guardar' disabled={guardando}>
                                    {guardando ? 'Guardando...' : editandoBloqueoId ? 'Guardar cambios' : 'Guardar reserva'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

const MisServiciosScreen = () => {
    const { persona } = useAuth()
    const [tabActiva, setTabActiva] = useState('tiendita')
    const [subtabTiendita, setSubtabTiendita] = useState('todos') // 'todos' | 'producto' | 'servicio'
    const [servicios, setServicios] = useState([])
    const [reservas, setReservas] = useState([])
    const [agenda, setAgenda] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mostrarForm, setMostrarForm] = useState(false)
    const [editando, setEditando] = useState(null)
    const [form, setForm] = useState(FORM_VACIO)
    const [unidadOtro, setUnidadOtro] = useState(false)  // true = escribir unidad personalizada
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [mostrarImportar, setMostrarImportar] = useState(false)
    const [subiendoFotoId, setSubiendoFotoId] = useState(null)
    const [mostrarContratoProv, setMostrarContratoProv] = useState(false)

    // Al entrar a la tienda, si no hay contrato de proveedor vigente, pedir su aceptación
    useEffect(() => {
        getMiContrato('proveedor')
            .then(d => { if (d?.requiere_nueva_aceptacion) setMostrarContratoProv(true) })
            .catch(() => {})
    }, [])

    const cargar = async () => {
        setCargando(true)
        const [data, res, ag] = await Promise.all([getMisServicios(), getMisReservasProveedor(), getMiAgenda()])
        setServicios(data)
        setReservas(res)
        setAgenda(ag || [])
        setCargando(false)
    }

    // Subir foto directo a un producto (ágil, para los importados sin imagen)
    const subirFotoProducto = async (servicio, file) => {
        if (!file) return
        setSubiendoFotoId(servicio.id_servicio)
        try {
            const url = await UploadImg(file)
            if (url) {
                await updateServicioProveedor(servicio.id_servicio, { ...servicio, imagen: url })
                await cargar()
            }
        } catch (err) {
            console.error('Error al subir foto del producto', err)
        } finally {
            setSubiendoFotoId(null)
        }
    }

    useEffect(() => { cargar() }, [])

    const abrirNuevo = () => { setEditando(null); setForm(FORM_VACIO); setUnidadOtro(false); setError(null); setMostrarForm(true) }
    const abrirEditar = (s) => {
        setEditando(s.id_servicio)
        const tipoItem = s.tipo_item || 'producto'
        const cfgPrecios = parsePreciosConfig(s.precios_tramos) || {}
        setForm({
            nombre: s.nombre,
            descripcion: s.descripcion,
            marca: s.marca || '',
            unidad: s.unidad || '',
            ideal_para_personas: s.ideal_para_personas ?? '',
            precio: s.precio_base ?? s.precio ?? '',
            categoria: s.categoria,
            subcategoria: s.subcategoria || '',
            tipo_precio: s.tipo_precio || 'fijo',
            tipo_item: tipoItem,
            imagen: s.imagen || '',
            capacidad_maxima: s.capacidad_maxima ?? '',
            dias_anticipacion: s.dias_anticipacion ?? '0',
            dias_disponibles: parseDias(s.dias_disponibles),
            horario_inicio: s.horario_inicio || '',
            horario_fin: s.horario_fin || '',
            precios_tramos: cfgPrecios,
        })
        setUnidadOtro(!!s.unidad && !UNIDADES_PREDEF.includes(s.unidad))
        setError(null); setMostrarForm(true)
    }
    const cerrarForm = () => { setMostrarForm(false); setEditando(null); setForm(FORM_VACIO); setError(null) }
    const handleChange = (e) => {
        const { name, value } = e.target
        // Al cambiar de categoría, resetear la subcategoría (solo aplica a algunas)
        if (name === 'categoria') {
            setForm(prev => ({ ...prev, categoria: value, subcategoria: '' }))
            return
        }
        setForm(prev => ({ ...prev, [name]: value }))
    }

    const handleTipoItemChange = (nuevoTipo) => {
        const catDefault = nuevoTipo === 'servicio' ? 'decoracion' : 'catering'
        const tipoPrecioDefault = nuevoTipo === 'producto' ? 'fijo' : form.tipo_precio
        setForm(prev => ({
            ...prev,
            tipo_item: nuevoTipo,
            categoria: catDefault,
            subcategoria: '',
            tipo_precio: tipoPrecioDefault,
            dias_disponibles: [],
            horario_inicio: '',
            horario_fin: '',
            precios_tramos: {},
        }))
    }

    const toggleDia = (dia) => {
        setForm(prev => {
            const dias = Array.isArray(prev.dias_disponibles) ? prev.dias_disponibles : []
            return {
                ...prev,
                dias_disponibles: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia]
            }
        })
    }

    const handleGuardar = async (e) => {
        e.preventDefault()
        if (!form.nombre || !form.descripcion || !form.precio || !form.categoria) {
            setError('Completá todos los campos obligatorios.'); return
        }
        setGuardando(true); setError(null)
        try {
            const datos = {
                nombre: form.nombre.trim(),
                descripcion: form.descripcion.trim(),
                marca: form.marca?.trim() || null,
                unidad: form.unidad?.trim() || null,
                ideal_para_personas: form.ideal_para_personas !== '' ? Number(form.ideal_para_personas) : null,
                precio: Number(form.precio),
                categoria: form.categoria,
                subcategoria: (SUBCATEGORIAS[form.categoria] ? form.subcategoria : '') || null,
                tipo_precio: form.tipo_precio,
                tipo_item: form.tipo_item || 'producto',
                imagen: form.imagen.trim() || null,
                capacidad_maxima: form.capacidad_maxima !== '' ? Number(form.capacidad_maxima) : null,
                dias_anticipacion: Number(form.dias_anticipacion) || 0,
                dias_disponibles: form.tipo_item === 'servicio' ? form.dias_disponibles : [],
                horario_inicio: form.tipo_item === 'servicio' ? (form.horario_inicio || null) : null,
                horario_fin: form.tipo_item === 'servicio' ? (form.horario_fin || null) : null,
                precios_tramos: form.tipo_item === 'servicio'
                    ? (form.precios_tramos && Object.keys(form.precios_tramos).length > 0 ? form.precios_tramos : null)
                    : null,
            }
            if (editando) await updateServicioProveedor(editando, datos)
            else await crearServicioProveedor(datos)
            await cargar(); cerrarForm()
        } catch (err) {
            setError(err?.response?.data?.message || 'Error al guardar. Intentá de nuevo.')
        } finally { setGuardando(false) }
    }

    const handleEliminar = async (id) => {
        try { await deleteServicioProveedor(id); setConfirmDelete(null); await cargar() }
        catch (err) { console.error('Error al eliminar:', err) }
    }

    const categLabel = (cat) => TODAS_CATEGORIAS.find(c => c.value === cat)?.label || cat
    const tipoPrecioLabel = (tp) => TIPOS_PRECIO.find(t => t.value === tp)?.label.split('(')[0].trim() || tp
    const sufijoPrecio = (tp) => TIPOS_PRECIO.find(t => t.value === tp)?.sufijo || ''

    // Filtrar según subtab
    const serviciosMostrados = servicios.filter(s => {
        if (subtabTiendita === 'todos') return true
        return (s.tipo_item || 'producto') === subtabTiendita
    })

    const categoriasForm = form.tipo_item === 'servicio' ? CATEGORIAS_SERVICIO : CATEGORIAS_PRODUCTO
    const tiposPrecioForm = form.tipo_item === 'servicio' ? TIPOS_PRECIO_SERVICIO : TIPOS_PRECIO_PRODUCTO

    const nProductos = servicios.filter(s => (s.tipo_item || 'producto') === 'producto').length
    const nServicios = servicios.filter(s => s.tipo_item === 'servicio').length

    return (
        <div className='mis-servicios-page'>
            <div className='mis-servicios-header'>
                <div className='mis-servicios-titulo'>
                    <FiPackage size={28} />
                    <div>
                        <h1>Mis Servicios</h1>
                        <p>Gestioná tu tiendita y revisá las reservas donde contrataron tus servicios</p>
                    </div>
                </div>
                <div className='mis-servicios-acciones'>
                    <GoogleCalendarConnectButton origen={typeof window !== 'undefined' && window.location.pathname.includes('catalogo') ? 'mi-catalogo' : 'mis-servicios'} />
                    <MpConnectButton />
                    {tabActiva === 'tiendita' && (
                        <>
                            <button className='btn-importar-excel' onClick={() => setMostrarImportar(true)}>
                                <FiUploadCloud size={17} /> Importar Excel
                            </button>
                            <button className='btn-nuevo-servicio' onClick={abrirNuevo}>
                                <FiPlus size={18} /> Agregar ítem
                            </button>
                        </>
                    )}
                </div>
            </div>

            {mostrarImportar && (
                <ImportarExcelModal
                    onClose={() => setMostrarImportar(false)}
                    onImportado={cargar}
                />
            )}

            {mostrarContratoProv && (
                <ContratoModal
                    ambito='proveedor'
                    onClose={() => setMostrarContratoProv(false)}
                    onAceptado={() => { setMostrarContratoProv(false); cargar() }}
                />
            )}

            {/* Tabs principales */}
            <div className='sv-tabs'>
                <button className={`sv-tab ${tabActiva === 'tiendita' ? 'sv-tab--active' : ''}`} onClick={() => setTabActiva('tiendita')}>
                    <FiPackage size={15}/> Mi Tiendita
                </button>
                <button className={`sv-tab ${tabActiva === 'reservas' ? 'sv-tab--active' : ''}`} onClick={() => setTabActiva('reservas')}>
                    <FiCalendar size={15}/> Reservas
                    {(() => {
                        const hoy = new Date().toISOString().slice(0,10)
                        const n = reservas.filter(r => r.fecha && String(r.fecha).slice(0,10) >= hoy && r.estado !== 'cancelada').length
                            + agenda.filter(a => !a.reserva_id && a.fecha && a.fecha.slice(0,10) >= hoy && a.estado_pago !== 'cancelado').length
                        return n > 0 ? <span className='sv-tab-badge'>{n}</span> : null
                    })()}
                </button>
            </div>

            {cargando ? (
                <div className='mis-servicios-loading'>Cargando...</div>
            ) : tabActiva === 'tiendita' ? (
                <>
                    {/* Subtabs tiendita */}
                    {servicios.length > 0 && (
                        <div className='tiendita-subtabs'>
                            <button className={`tiendita-subtab ${subtabTiendita === 'todos' ? 'active' : ''}`} onClick={() => setSubtabTiendita('todos')}>
                                Todos <span className='subtab-count'>{servicios.length}</span>
                            </button>
                            <button className={`tiendita-subtab ${subtabTiendita === 'producto' ? 'active' : ''}`} onClick={() => setSubtabTiendita('producto')}>
                                <FiPackage size={13}/> Productos <span className='subtab-count'>{nProductos}</span>
                            </button>
                            <button className={`tiendita-subtab ${subtabTiendita === 'servicio' ? 'active' : ''}`} onClick={() => setSubtabTiendita('servicio')}>
                                <FiStar size={13}/> Servicios <span className='subtab-count'>{nServicios}</span>
                            </button>
                        </div>
                    )}

                    {serviciosMostrados.length === 0 ? (
                        <div className='mis-servicios-vacio'>
                            <FiPackage size={56} />
                            <h3>Tu tiendita está vacía</h3>
                            <p>Agregá <strong>productos</strong> (catering, mobiliario, etc.) o <strong>servicios</strong> (entretenimiento, decoración, etc.) para que los organizadores puedan contratarte.</p>
                            <button className='btn-nuevo-servicio' onClick={abrirNuevo}><FiPlus size={16}/> Agregar primer ítem</button>
                        </div>
                    ) : (
                        <div className='mis-servicios-grid'>
                            {serviciosMostrados.map(s => {
                                const tipoItem = s.tipo_item || 'producto'
                                const dias = parseDias(s.dias_disponibles)
                                const horario = fmtHorario(s.horario_inicio, s.horario_fin)
                                const cfgPrecios = parsePreciosConfig(s.precios_tramos)
                                const sufijo = sufijoPrecio(s.tipo_precio)
                                return (
                                    <div key={s.id_servicio} className={`tienda-card tienda-card--${tipoItem} ${!s.disponible ? 'inactivo' : ''}`}>
                                        {s.imagen ? (
                                            <div className='tienda-card-img-wrap'>
                                                <img src={s.imagen} alt={s.nombre} className='tienda-card-img' />
                                                <label className='tienda-card-foto-btn' title='Cambiar foto'>
                                                    <FiCamera size={14} />
                                                    <input type='file' accept='image/*' style={{ display: 'none' }}
                                                        onChange={(e) => subirFotoProducto(s, e.target.files?.[0])} />
                                                </label>
                                            </div>
                                        ) : (
                                            <label className='tienda-card-foto-placeholder'>
                                                {subiendoFotoId === s.id_servicio
                                                    ? <span>Subiendo…</span>
                                                    : <><FiCamera size={22} /><span>Agregar foto</span></>}
                                                <input type='file' accept='image/*' style={{ display: 'none' }}
                                                    onChange={(e) => subirFotoProducto(s, e.target.files?.[0])} />
                                            </label>
                                        )}
                                        <div className='tienda-card-body'>
                                            <div className='tienda-card-tags'>
                                                <span className={`tag-tipo-item tag-ti--${tipoItem}`}>
                                                    {tipoItem === 'servicio' ? <><FiStar size={10}/> Servicio</> : <><FiPackage size={10}/> Producto</>}
                                                </span>
                                                <span className='tag-categoria'>{categLabel(s.categoria)}</span>
                                                {s.subcategoria && SUBCATEGORIA_LABEL[s.subcategoria] && (
                                                    <span className='tag-categoria'>{SUBCATEGORIA_LABEL[s.subcategoria]}</span>
                                                )}
                                                <span className={`tag-tipo tp-${s.tipo_precio || 'fijo'}`}>{tipoPrecioLabel(s.tipo_precio)}</span>
                                                {!s.disponible && <span className='tag-inactivo'>Inactivo</span>}
                                            </div>
                                            <h3>{s.nombre}</h3>
                                            <p className='tienda-card-desc'>{s.descripcion}</p>

                                            {/* Horarios para servicios */}
                                            {tipoItem === 'servicio' && (dias.length > 0 || horario) && (
                                                <div className='tienda-card-schedule'>
                                                    {dias.length > 0 && (
                                                        <div className='schedule-dias'>
                                                            {DIAS_FORM.map(d => (
                                                                <span key={d.value} className={`dia-chip ${dias.includes(d.value) ? 'dia-chip--activo' : 'dia-chip--inactivo'}`}>
                                                                    {d.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {horario && <div className='schedule-horario'><FiClock size={11}/> {horario}</div>}
                                                </div>
                                            )}

                                            {/* Precio base (lo que cobra el proveedor) */}
                                            <div className='tienda-card-precio'>
                                                <span className='precio-base-label'>Base:</span>
                                                <strong>${Number(s.precio_base ?? s.precio ?? 0).toLocaleString('es-AR')}</strong>
                                                {sufijo && <span className='precio-sufijo-label'> {sufijo}</span>}
                                            </div>

                                            {/* Descuento por cantidad */}
                                            {s.descuento_cantidad_min && s.descuento_porcentaje && (
                                                <div className='tienda-card-descuento'>
                                                    🏷️ {s.descuento_porcentaje}% desde {s.descuento_cantidad_min} u
                                                </div>
                                            )}

                                            {/* Opciones de turno */}
                                            {s.tipo_precio === 'por_turno' && cfgPrecios?.opciones_turno?.length > 0 && (
                                                <div className='tienda-card-turnos'>
                                                    {cfgPrecios.opciones_turno.map((op, i) => (
                                                        <div key={i} className='tienda-card-turno-opcion'>
                                                            <FiClock size={10}/>
                                                            <span>{op.horas ?? '?'}h</span>
                                                            {op.precio != null && (
                                                                <strong>${Number(op.precio).toLocaleString('es-AR')}</strong>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Backward compat: old single duracion_turno */}
                                            {s.tipo_precio === 'por_turno' && cfgPrecios?.duracion_turno != null && !cfgPrecios?.opciones_turno?.length && (
                                                <div className='tienda-card-turno'>
                                                    <FiClock size={11}/> Turno: <strong>{cfgPrecios.duracion_turno}h</strong>
                                                </div>
                                            )}

                                            {/* Precios diferenciados por tipo de día */}
                                            {cfgPrecios && (cfgPrecios.fin_semana != null || cfgPrecios.feriado != null) && (
                                                <div className='card-tramos'>
                                                    {cfgPrecios.fin_semana != null && (
                                                        <div className='card-tramo-row'>
                                                            <span className='card-tramo-franja' style={{ color: '#8b5cf6' }}>Fin de semana</span>
                                                            <strong className='card-tramo-precio'>
                                                                ${Number(cfgPrecios.fin_semana).toLocaleString('es-AR')}{sufijo ? ` ${sufijo}` : ''}
                                                            </strong>
                                                        </div>
                                                    )}
                                                    {cfgPrecios.feriado != null && (
                                                        <div className='card-tramo-row'>
                                                            <span className='card-tramo-franja' style={{ color: '#f97316' }}>Feriados</span>
                                                            <strong className='card-tramo-precio'>
                                                                ${Number(cfgPrecios.feriado).toLocaleString('es-AR')}{sufijo ? ` ${sufijo}` : ''}
                                                            </strong>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className='tienda-card-acciones'>
                                            <button className='btn-editar-servicio' onClick={() => abrirEditar(s)} title='Editar'><FiEdit2 size={16}/></button>
                                            {confirmDelete === s.id_servicio ? (
                                                <div className='confirm-delete'>
                                                    <span>¿Desactivar?</span>
                                                    <button className='btn-confirmar-delete' onClick={() => handleEliminar(s.id_servicio)}><FiCheck size={14}/> Sí</button>
                                                    <button className='btn-cancelar-delete' onClick={() => setConfirmDelete(null)}><FiX size={14}/></button>
                                                </div>
                                            ) : (
                                                <button className='btn-eliminar-servicio' onClick={() => setConfirmDelete(s.id_servicio)} title='Desactivar'><FiTrash2 size={16}/></button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            ) : (
                <TabReservasProveedor reservas={reservas} agenda={agenda} onActualizar={cargar} servicios={servicios} />
            )}

            {/* Modal de formulario */}
            {mostrarForm && (
                <div className='form-overlay' onClick={cerrarForm}>
                    <div className='form-modal form-modal--wide' onClick={e => e.stopPropagation()}>
                        <div className='form-modal-header'>
                            <h2>{editando ? 'Editar ítem' : 'Nuevo ítem en tu tiendita'}</h2>
                            <button className='btn-cerrar-form' onClick={cerrarForm}><FiX size={20}/></button>
                        </div>

                        {/* Selector de tipo */}
                        <div className='tipo-item-selector'>
                            <button
                                type='button'
                                className={`tipo-item-btn ${form.tipo_item === 'producto' ? 'tipo-item-btn--active' : ''}`}
                                onClick={() => handleTipoItemChange('producto')}
                            >
                                <FiPackage size={22}/>
                                <span className='tipo-item-btn-title'>Producto</span>
                                <span className='tipo-item-btn-desc'>Catering, bebidas, mobiliario, ítems físicos</span>
                            </button>
                            <button
                                type='button'
                                className={`tipo-item-btn ${form.tipo_item === 'servicio' ? 'tipo-item-btn--active' : ''}`}
                                onClick={() => handleTipoItemChange('servicio')}
                            >
                                <FiStar size={22}/>
                                <span className='tipo-item-btn-title'>Servicio</span>
                                <span className='tipo-item-btn-desc'>Entretenimiento, decoración, audio, fotografía</span>
                            </button>
                        </div>

                        <form onSubmit={handleGuardar} className='form-tienda'>
                            <div className='form-group'>
                                <label>Nombre *</label>
                                <input type='text' name='nombre' value={form.nombre} onChange={handleChange}
                                    placeholder={form.tipo_item === 'servicio' ? 'Ej: Show de magia para 80 personas' : 'Ej: Catering para 50 personas'}
                                    maxLength={100}/>
                            </div>
                            <div className='form-group'>
                                <label>Descripción *</label>
                                <textarea name='descripcion' value={form.descripcion} onChange={handleChange}
                                    placeholder={form.tipo_item === 'servicio' ? 'Describí en qué consiste tu servicio, duración, incluye...' : 'Describí qué incluye tu producto'}
                                    rows={3} maxLength={500}/>
                            </div>
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label>Marca <span className='label-hint'>(opcional)</span></label>
                                    <input type='text' name='marca' value={form.marca} onChange={handleChange}
                                        placeholder='Ej: Coca-Cola' maxLength={120}/>
                                </div>
                                <div className='form-group'>
                                    <label>Unidad de venta <span className='label-hint'>(opcional)</span></label>
                                    <select
                                        value={unidadOtro ? 'otro' : form.unidad}
                                        onChange={e => {
                                            const v = e.target.value
                                            if (v === 'otro') { setUnidadOtro(true); setForm(p => ({ ...p, unidad: '' })) }
                                            else { setUnidadOtro(false); setForm(p => ({ ...p, unidad: v })) }
                                        }}
                                    >
                                        <option value=''>— Sin unidad —</option>
                                        {UNIDADES_PREDEF.map(u => <option key={u} value={u}>{u}</option>)}
                                        <option value='otro'>Otro (escribir)…</option>
                                    </select>
                                    {unidadOtro && (
                                        <input type='text' name='unidad' value={form.unidad} onChange={handleChange}
                                            placeholder='Ej: bandeja de 12' maxLength={40} style={{ marginTop: 6 }}/>
                                    )}
                                </div>
                                <div className='form-group'>
                                    <label>Ideal para N personas <span className='label-hint'>(opcional)</span></label>
                                    <input type='number' name='ideal_para_personas' value={form.ideal_para_personas} onChange={handleChange}
                                        placeholder='Ej: 50' min='1'/>
                                    <span className='label-hint'>Se destaca cuando coincide con el cupo del evento.</span>
                                </div>
                            </div>
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label>Categoría *</label>
                                    <select name='categoria' value={form.categoria} onChange={handleChange}>
                                        {categoriasForm.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                {SUBCATEGORIAS[form.categoria] && (
                                    <div className='form-group'>
                                        <label>Subcategoría</label>
                                        <select name='subcategoria' value={form.subcategoria} onChange={handleChange}>
                                            <option value=''>— Elegí —</option>
                                            {SUBCATEGORIAS[form.categoria].map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className='form-group'>
                                    <label>Tipo de precio *</label>
                                    <select name='tipo_precio' value={form.tipo_precio} onChange={handleChange}>
                                        {tiposPrecioForm.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className='form-group'>
                                <label>Precio *{sufijoPrecio(form.tipo_precio) && <span className='label-hint'> (monto {sufijoPrecio(form.tipo_precio)})</span>}</label>
                                <div className='precio-input-wrapper'>
                                    <span className='precio-simbolo'>$</span>
                                    <input type='number' name='precio' value={form.precio} onChange={handleChange} placeholder='0' min='0' step='0.01'/>
                                    {sufijoPrecio(form.tipo_precio) && <span className='precio-sufijo'>{sufijoPrecio(form.tipo_precio)}</span>}
                                </div>
                            </div>

                            {/* Panel exclusivo para servicios */}
                            {form.tipo_item === 'servicio' && (
                                <div className='servicio-config-panel'>
                                    <div className='form-seccion-titulo'><FiCalendar size={13}/> Días disponibles</div>
                                    <div className='dias-checkboxes'>
                                        {DIAS_FORM.map(d => (
                                            <label key={d.value} className={`dia-check-label ${(form.dias_disponibles || []).includes(d.value) ? 'dia-check-label--activo' : ''}`}>
                                                <input type='checkbox' checked={(form.dias_disponibles || []).includes(d.value)} onChange={() => toggleDia(d.value)}/>
                                                {d.label}
                                            </label>
                                        ))}
                                    </div>

                                    <div className='form-seccion-titulo'><FiClock size={13}/> Horario general disponible</div>
                                    <div className='form-row'>
                                        <div className='form-group'>
                                            <label>Desde</label>
                                            <input type='time' name='horario_inicio' value={form.horario_inicio} onChange={handleChange}/>
                                        </div>
                                        <div className='form-group'>
                                            <label>Hasta</label>
                                            <input type='time' name='horario_fin' value={form.horario_fin} onChange={handleChange}/>
                                        </div>
                                    </div>

                                    {/* Precios diferenciados por tipo de día */}
                                    <div className='form-seccion-titulo'>
                                        <span>💲 Precios diferenciados</span>
                                    </div>
                                    <p className='tramos-ayuda'>
                                        Definí precios para fines de semana y feriados. El precio base se aplica si no configurás un override.
                                    </p>
                                    <PreciosConfigPanel
                                        config={form.precios_tramos || {}}
                                        onChange={cfg => setForm(prev => ({ ...prev, precios_tramos: cfg }))}
                                        dark={false}
                                        precioBase={form.precio}
                                        showHoraToggle={false}
                                        tipoPrecio={form.tipo_precio}
                                    />

                                </div>
                            )}

                            <div className='form-group'>
                                <label>URL de imagen (opcional)</label>
                                <input type='url' name='imagen' value={form.imagen} onChange={handleChange} placeholder='https://...'/>
                                {form.imagen && <img src={form.imagen} alt='preview' className='img-preview'/>}
                            </div>
                            <div className='form-seccion-titulo'>Disponibilidad y capacidad</div>
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label>Capacidad máxima diaria<span className='label-hint'> (vacío = sin límite)</span></label>
                                    <input type='number' name='capacidad_maxima' value={form.capacidad_maxima} onChange={handleChange} placeholder='Sin límite' min='1'/>
                                </div>
                                <div className='form-group'>
                                    <label>Días de anticipación<span className='label-hint'> (mín. para reservar)</span></label>
                                    <input type='number' name='dias_anticipacion' value={form.dias_anticipacion} onChange={handleChange} placeholder='0' min='0'/>
                                </div>
                            </div>
                            {error && <p className='form-error'>{error}</p>}
                            <div className='form-acciones'>
                                <button type='button' className='btn-cancelar' onClick={cerrarForm}>Cancelar</button>
                                <button type='submit' className='btn-guardar' disabled={guardando}>
                                    {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar ítem'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MisServiciosScreen
