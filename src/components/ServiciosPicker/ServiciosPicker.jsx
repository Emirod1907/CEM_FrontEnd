/**
 * ServiciosPicker — modal self-contained para elegir servicios adicionales
 * dentro del form de evento (antes de crear la reserva).
 *
 * Props:
 *  - fechaEvento  string  "YYYY-MM-DD"
 *  - cupo         number  cupo de invitados del evento (para tipo por_persona)
 *  - seleccionados  array  [{ id_servicio, nombre, precio, tipo_precio, ... }]
 *  - onChange     fn(nuevaLista)
 *  - onClose      fn()
 */
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getServicios, getDisponibilidadServicios } from '../../services/servicioServices'
import { calcularPrecioServicio, precioUnitarioConDescuento, TIPO_DIA_LABEL, TIPO_DIA_COLOR } from '../../utils/preciosUtils'
import { useCarrito } from '../../Contexts/CarritoContextProvider'
import { TortaCamposForm, TortaDetalleView, TORTA_VACIO, tieneDatosTorta, FichaTortaView } from '../TortaCampos/TortaCampos'
import { FiX, FiPlus, FiMinus, FiCheck, FiClock, FiRepeat, FiUsers, FiPackage, FiStar, FiEdit2, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import TimePicker24 from '../TimePicker24/TimePicker24'
import './ServiciosPicker.css'

const CATEGORIAS_LABEL = {
    catering: 'Catering', decoracion: 'Decoración', audio_video: 'Audio y Video',
    seguridad: 'Seguridad', personal: 'Provisión de Personal', mobiliario: 'Mobiliario',
    entretenimiento: 'Entretenimiento', tortas: 'Elaboración de Tortas',
    bebidas: 'Bebidas', comida: 'Alimentos', alimentos: 'Alimentos',
    cotillon: 'Cotillón y Souvenirs', vajilla: 'Vajilla', otro: 'Otros'
}

const parsePreciosConfig = (v) => {
    if (!v) return null
    try { const p = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(p) ? null : p } catch { return null }
}

const getOpcionesTurno = (servicio) => {
    const cfg = parsePreciosConfig(servicio.precios_tramos)
    return Array.isArray(cfg?.opciones_turno) && cfg.opciones_turno.length > 0 ? cfg.opciones_turno : null
}

// Solo entretenimiento se consume DURANTE el evento (el usuario elige el
// horario dentro del evento). Todo lo demás (música, decoración, proyector,
// tortas, etc.) se ENTREGA 2-3 horas antes de comenzar el evento.
// Catering: entrega sugerida 2h antes, pero editable — la comida caliente
// puede requerirse a un horario determinado.
export const CATEGORIAS_HORA_EDITABLE = ['entretenimiento', 'catering']

export const HORAS_ANTES = {
    decoracion:      3,
    mobiliario:      3,
    audio_video:     2,
    seguridad:       2,
    catering:        2,
    otro:            2,
}

const sumarMinutos = (horaStr, deltaMins) => {
    const [h, m] = horaStr.split(':').map(Number)
    const total  = ((h * 60 + m + deltaMins) + 24 * 60) % (24 * 60)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Devuelve la hora de entrega/inicio para un servicio.
// entretenimientoIdx: cuántos entretenimientos ya hay seleccionados (para escalonar 2h c/u).
export const sugerirHoraServicio = (categoria, horaEvento, entretenimientoIdx = 0) => {
    if (!horaEvento) return ''
    if (categoria === 'entretenimiento') {
        return sumarMinutos(horaEvento, entretenimientoIdx * 120)
    }
    const antesMin = (HORAS_ANTES[categoria] ?? 2) * 60
    return sumarMinutos(horaEvento, -antesMin)
}

// embebido: renderiza sin overlay/modal, para usarse dentro de una página.
// soloTipo ('servicio'|'producto'): fija el tab y oculta el selector de tipo.
const ServiciosPicker = ({ fechaEvento, horaEvento, horaFinEvento, cupo, seleccionados = [], onChange, onClose, embebido = false, soloTipo = null, sinGuardar = false, guardando = false, onConfirmar = null }) => {
    const [servicios, setServicios] = useState([])
    const [cargando, setCargando] = useState(true)
    const [disponibilidad, setDisponibilidad] = useState({})
    const [tabTipo, setTabTipo] = useState(soloTipo || 'producto')
    const [categoriaActiva, setCategoriaActiva] = useState('todos')
    // controles locales de unidades por servicio
    const [horasPor, setHorasPor]       = useState({})
    const [turnosPor, setTurnosPor]     = useState({})
    const [horaPor, setHoraPor]         = useState({})
    const [opcionTurnoPor, setOpcionTurnoPor] = useState({})
    // Panel de "agregados": colapsable + edición de condiciones por ítem
    const [agregadosAbierto, setAgregadosAbierto] = useState(true)
    const [editId, setEditId] = useState(null)
    // Cantidad tipeada en la tarjeta ANTES de agregar (id → cantidad)
    const [cantidadNueva, setCantidadNueva] = useState({})
    // Modal de requisitos de torta: { servicio, detalle, editId } | null
    const [tortaModal, setTortaModal] = useState(null)

    // Comisión del cliente incorporada de forma invisible en TODO precio mostrado.
    // Vale 1 mientras no haya una reserva cargada (aún no se congeló la comisión).
    const { factorComisionOrg } = useCarrito()
    const conCom = (n) => Number(n) * (Number(factorComisionOrg) || 1)

    useEffect(() => {
        getServicios().then(d => { setServicios(d || []); setCargando(false) })
    }, [])

    useEffect(() => {
        if (!fechaEvento) return
        getDisponibilidadServicios(fechaEvento, cupo || 0).then(lista => {
            const mapa = {}
            for (const it of lista) mapa[it.id_servicio] = it
            setDisponibilidad(mapa)
        })
    }, [fechaEvento, cupo])

    const selMap = Object.fromEntries(seleccionados.map(s => [s.id_servicio, s]))
    // Los ítems ya agregados NO se muestran en la lista de abajo: quedan solo arriba
    const serviciosPorTipo = servicios.filter(s => (s.tipo_item || 'producto') === tabTipo && !selMap[s.id_servicio])
    const categorias = ['todos', ...new Set(serviciosPorTipo.map(s => s.categoria))]
    const filtrados = categoriaActiva === 'todos' ? serviciosPorTipo : serviciosPorTipo.filter(s => s.categoria === categoriaActiva)

    const getPrecioUnitario = (servicio) => {
        const opciones = getOpcionesTurno(servicio)
        if (opciones && servicio.tipo_precio === 'por_turno') {
            const idx = opcionTurnoPor[servicio.id_servicio] ?? 0
            const op = opciones[idx] || opciones[0]
            return Number(op?.precio ?? servicio.precio) || 0
        }
        const info = calcularPrecioServicio(servicio.precio, servicio.precios_tramos, fechaEvento || '', servicio.tipo_precio, 1)
        return info.precioUnitario
    }

    const calcTotal = (servicio) => {
        const id = servicio.id_servicio
        const tp = servicio.tipo_precio
        const base = getPrecioUnitario(servicio)
        if (tp === 'por_persona') return base * Math.max(1, Number(cupo) || 1)
        if (tp === 'por_hora')   return base * Math.max(1, Number(horasPor[id]) || 1)
        if (tp === 'por_turno')  return base * Math.max(1, Number(turnosPor[id]) || 1)
        return base
    }

    // Construye el ítem del carrito a partir del servicio + estado local (horas/turnos/hora).
    const construirItem = (servicio, extra = {}) => {
        const id = servicio.id_servicio
        const tp = servicio.tipo_precio
        const opciones = getOpcionesTurno(servicio)
        const opIdx = opcionTurnoPor[id] ?? 0
        const opSel = opciones ? (opciones[opIdx] || opciones[0]) : null
        const horas  = opSel?.horas ?? (Number(horasPor[id]) || 1)
        const turnos = Number(turnosPor[id]) || 1
        // Entretenimiento y catering: el usuario puede elegir el horario
        // (entretenimiento durante el evento; catering p.ej. comida caliente).
        // Resto: entrega automática 2-3h antes del evento, no editable.
        const horaEditable = CATEGORIAS_HORA_EDITABLE.includes(servicio.categoria)
        const entretenimientoYa = seleccionados.filter(s => s.categoria === 'entretenimiento').length
        const horaAutoSugerida = sugerirHoraServicio(servicio.categoria, horaEvento || '', entretenimientoYa)
        const horaManual = horaEditable ? (horaPor[id] || null) : null
        const horaFinal = horaManual || horaAutoSugerida || null
        return {
            id_servicio:  servicio.id_servicio,
            nombre:       servicio.nombre,
            descripcion:  servicio.descripcion,
            precio:       getPrecioUnitario(servicio),
            categoria:    servicio.categoria,
            tipo_precio:  tp,
            tipo_item:    servicio.tipo_item || 'producto',
            imagen:       servicio.imagen || null,
            cantidad:     Math.max(1, Math.floor(Number(cantidadNueva[id]) || 1)),
            horas:  tp === 'por_hora'  ? horas  : null,
            turnos: tp === 'por_turno' ? turnos : null,
            // por persona: arranca con el total de invitados, pero es editable por ítem
            personas: tp === 'por_persona' ? (Number(cupo) || 1) : null,
            hora_inicio: horaFinal,
            hora_manual: !!horaManual,
            descuento_cantidad_min: servicio.descuento_cantidad_min ?? null,
            descuento_porcentaje:   servicio.descuento_porcentaje ?? null,
            _opcionTurno: opSel || null,
            ...extra,
        }
    }

    const toggleServicio = (servicio) => {
        const id = servicio.id_servicio
        if (selMap[id]) {
            onChange(seleccionados.filter(s => s.id_servicio !== id))
        } else if (servicio.categoria === 'tortas') {
            // Elaboración de tortas: primero se completan los requisitos del diseño.
            setTortaModal({ servicio, detalle: { ...TORTA_VACIO, personas: Number(cupo) || '' }, editId: null })
        } else {
            onChange([...seleccionados, construirItem(servicio)])
        }
    }

    // Confirma el modal de requisitos de la torta y agrega/edita el ítem.
    const confirmarTorta = () => {
        if (!tortaModal) return
        const { servicio, detalle, editId } = tortaModal
        if (editId) patchSel(editId, { detalle_torta: detalle })
        else onChange([...seleccionados, construirItem(servicio, { detalle_torta: detalle })])
        setTortaModal(null)
    }
    const abrirEditarTorta = (s) => setTortaModal({
        servicio: s, editId: s.id_servicio,
        detalle: { ...TORTA_VACIO, personas: Number(cupo) || '', ...(s.detalle_torta || {}) },
    })

    const updateCantidad = (id, delta) => {
        onChange(seleccionados.map(s => s.id_servicio === id
            ? { ...s, cantidad: Math.max(1, s.cantidad + delta) }
            : s
        ))
    }

    // Setea la cantidad exacta (entero >= 1) tipeada en el input
    const setCantidad = (id, value) => {
        const n = Math.max(1, Math.floor(Number(value) || 1))
        onChange(seleccionados.map(s => s.id_servicio === id ? { ...s, cantidad: n } : s))
    }

    // Cantidad de personas de un ítem por persona (comida/viandas), editable por ítem
    const updatePersonas = (id, delta) => {
        onChange(seleccionados.map(s => s.id_servicio === id
            ? { ...s, personas: Math.max(1, (Number(s.personas) || Number(cupo) || 1) + delta) }
            : s
        ))
    }
    const personasDe = (s) => Number(s.personas) > 0 ? Number(s.personas) : Math.max(1, Number(cupo) || 1)

    // Edita cualquier condición de un ítem ya agregado (hora de entrega, horas, turnos, personas)
    const patchSel = (id, patch) => onChange(seleccionados.map(s => s.id_servicio === id ? { ...s, ...patch } : s))
    // "Cubrir cupo": fija las personas al total de invitados del evento
    const setPersonasCupo = (id) => patchSel(id, { personas: Math.max(1, Number(cupo) || 1) })

    // Subtotal de un ítem ya agregado (misma lógica que el carrito):
    // precio unitario (con descuento por cantidad) × cantidad × multiplicador por tipo.
    const subtotalSeleccionado = (s) => {
        let mult = 1
        if (s.tipo_precio === 'por_persona')   mult = personasDe(s)
        else if (s.tipo_precio === 'por_hora')  mult = Math.max(1, Number(s.horas)  || 1)
        else if (s.tipo_precio === 'por_turno') mult = Math.max(1, Number(s.turnos) || 1)
        return conCom(precioUnitarioConDescuento(s)) * (Number(s.cantidad) || 1) * mult
    }

    const nProductos = servicios.filter(s => (s.tipo_item || 'producto') === 'producto').length
    const nServicios = servicios.filter(s => s.tipo_item === 'servicio').length

    return (
        <div className={embebido ? 'spk-embebido' : 'spk-overlay'} onClick={embebido ? undefined : onClose}>
            <div className={embebido ? 'spk-panel' : 'spk-modal'} onClick={e => e.stopPropagation()}>

                {/* Header (solo como modal; en página el header lo pone la pantalla) */}
                {!embebido && (
                    <div className='spk-header'>
                        <div>
                            <h2>Servicios adicionales</h2>
                            <span className='spk-header-hint'>
                                {fechaEvento
                                    ? `Para el ${new Date(fechaEvento + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}`
                                    : 'Seleccioná una fecha primero para ver precios ajustados'
                                }
                                {horaEvento && (
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#a78bfa', marginTop: '2px' }}>
                                        <FiClock size={11}/> Evento a las {horaEvento} — los horarios de entrega se sugieren automáticamente
                                    </span>
                                )}
                            </span>
                        </div>
                        <button className='spk-cerrar' onClick={onClose}><FiX size={21}/></button>
                    </div>
                )}

                {/* Tabs tipo (se ocultan cuando la página fija un solo tipo) */}
                {!soloTipo && (
                    <div className='spk-tipo-tabs'>
                        <button className={`spk-tipo-tab ${tabTipo === 'producto' ? 'active' : ''}`} onClick={() => { setTabTipo('producto'); setCategoriaActiva('todos') }}>
                            <FiPackage size={13}/> Productos {nProductos > 0 && <span className='spk-tipo-count'>{nProductos}</span>}
                        </button>
                        <button className={`spk-tipo-tab ${tabTipo === 'servicio' ? 'active' : ''}`} onClick={() => { setTabTipo('servicio'); setCategoriaActiva('todos') }}>
                            <FiStar size={13}/> Servicios {nServicios > 0 && <span className='spk-tipo-count'>{nServicios}</span>}
                        </button>
                    </div>
                )}

                {/* Ítems ya agregados: panel colapsable, editable hasta el pago */}
                {seleccionados.length > 0 && (
                    <div className='spk-seleccionados'>
                        <button
                            className='spk-seleccionados-header'
                            onClick={() => setAgregadosAbierto(v => !v)}
                            type='button'
                        >
                            <span className='spk-seleccionados-titulo'>
                                {soloTipo === 'servicio' ? 'Servicios agregados'
                                    : soloTipo === 'producto' ? 'Productos agregados'
                                    : 'Agregados'} ({seleccionados.length})
                            </span>
                            {agregadosAbierto ? <FiChevronUp size={16}/> : <FiChevronDown size={16}/>}
                        </button>

                        {agregadosAbierto && (
                            <div className='spk-add-lista'>
                                {seleccionados.map(s => {
                                    const id = s.id_servicio
                                    const porPersona = s.tipo_precio === 'por_persona'
                                    const porHora    = s.tipo_precio === 'por_hora'
                                    const porTurno   = s.tipo_precio === 'por_turno'
                                    const horaEditable = CATEGORIAS_HORA_EDITABLE.includes(s.categoria)
                                    const unidad = porPersona ? '/pers.' : porHora ? '/h' : porTurno ? '/turno' : ''
                                    const qtyValor = porPersona ? personasDe(s) : Number(s.cantidad)
                                    const onMenos = porPersona ? () => updatePersonas(id, -1) : () => updateCantidad(id, -1)
                                    const onMas   = porPersona ? () => updatePersonas(id, +1) : () => updateCantidad(id, +1)
                                    const abierto = editId === id
                                    return (
                                        <div key={id} className={`spk-add-row ${abierto ? 'spk-add-row--abierto' : ''}`}>
                                            <div className='spk-add-main'>
                                                {s.imagen && <img src={s.imagen} alt='' className='spk-add-img'/>}
                                                <div className='spk-add-info'>
                                                    <span className='spk-add-nombre'>{s.nombre}</span>
                                                    <span className='spk-add-precio'>
                                                        ${Number(subtotalSeleccionado(s)).toLocaleString('es-AR')}
                                                        <small> (${Number(conCom(precioUnitarioConDescuento(s))).toLocaleString('es-AR')}{unidad} c/u)</small>
                                                    </span>
                                                    {s.hora_inicio && (
                                                        <span className='spk-add-cond'>
                                                            <FiClock size={11}/> Entrega {s.hora_inicio}
                                                            {porHora && ` · ${s.horas || 1}h`}
                                                            {porTurno && ` · ${s.turnos || 1} turno(s)`}
                                                        </span>
                                                    )}
                                                    {s.categoria === 'tortas' && (
                                                        <button type='button' className='spk-torta-link'
                                                            onClick={() => abrirEditarTorta(s)}>
                                                            🎂 {tieneDatosTorta(s.detalle_torta) ? 'Editar requisitos de la torta' : '⚠ Completá los requisitos de la torta'}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className='spk-add-controls'>
                                                    <div className='spk-chip-qty'>
                                                        {porPersona && <span className='spk-chip-qty-label'>pers.</span>}
                                                        <button className='spk-chip-qty-btn' onClick={onMenos} disabled={qtyValor <= 1} title='Menos'><FiMinus size={12}/></button>
                                                        {porPersona ? (
                                                            <span className='spk-chip-qty-num'>{qtyValor}</span>
                                                        ) : (
                                                            <input
                                                                type='number' min='1' step='1'
                                                                className='spk-chip-qty-input'
                                                                value={qtyValor}
                                                                onChange={e => setCantidad(id, e.target.value)}
                                                                onFocus={e => e.target.select()}
                                                                aria-label='Cantidad'
                                                            />
                                                        )}
                                                        <button className='spk-chip-qty-btn' onClick={onMas} title='Más'><FiPlus size={12}/></button>
                                                    </div>
                                                    <button
                                                        className={`spk-add-editar ${abierto ? 'activo' : ''}`}
                                                        onClick={() => setEditId(abierto ? null : id)}
                                                        title='Editar condiciones'
                                                    >
                                                        <FiEdit2 size={13}/>
                                                    </button>
                                                    <button
                                                        className='spk-add-quitar'
                                                        onClick={() => { setEditId(null); onChange(seleccionados.filter(x => x.id_servicio !== id)) }}
                                                        title='Quitar'
                                                    >
                                                        <FiX size={13}/> Quitar
                                                    </button>
                                                </div>
                                            </div>

                                            {abierto && (
                                                <div className='spk-add-editor'>
                                                    {porPersona && (
                                                        <div className='spk-add-editor-row'>
                                                            <label>Personas</label>
                                                            <input
                                                                type='number' min={1}
                                                                value={personasDe(s)}
                                                                onChange={e => patchSel(id, { personas: Math.max(1, Number(e.target.value) || 1) })}
                                                                className='spk-add-input'
                                                            />
                                                            <button className='spk-add-cupo-btn' onClick={() => setPersonasCupo(id)}>
                                                                <FiUsers size={12}/> Cubrir cupo ({Math.max(1, Number(cupo) || 1)})
                                                            </button>
                                                        </div>
                                                    )}
                                                    {porHora && (
                                                        <div className='spk-add-editor-row'>
                                                            <label>Horas contratadas</label>
                                                            <input
                                                                type='number' min={1}
                                                                value={s.horas || 1}
                                                                onChange={e => patchSel(id, { horas: Math.max(1, Number(e.target.value) || 1) })}
                                                                className='spk-add-input'
                                                            />
                                                        </div>
                                                    )}
                                                    {porTurno && (
                                                        <div className='spk-add-editor-row'>
                                                            <label>Turnos</label>
                                                            <input
                                                                type='number' min={1}
                                                                value={s.turnos || 1}
                                                                onChange={e => patchSel(id, { turnos: Math.max(1, Number(e.target.value) || 1) })}
                                                                className='spk-add-input'
                                                            />
                                                        </div>
                                                    )}
                                                    {horaEditable ? (
                                                        <div className='spk-add-editor-row'>
                                                            <label>{s.categoria === 'entretenimiento' ? 'Hora de inicio' : 'Hora de entrega'}</label>
                                                            <TimePicker24
                                                                value={s.hora_inicio || ''}
                                                                onChange={v => patchSel(id, { hora_inicio: v, hora_manual: true })}
                                                            />
                                                        </div>
                                                    ) : s.hora_inicio && (
                                                        <div className='spk-add-editor-nota'>
                                                            <FiClock size={12}/> Entrega automática a las {s.hora_inicio} (se calcula unas horas antes del evento)
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Confirmar cambios (PATCH explícito a la reserva) */}
                        {onConfirmar && (
                            <div className='spk-add-footer'>
                                {sinGuardar && <span className='spk-add-pendiente'>Tenés cambios sin confirmar</span>}
                                <button
                                    className={`spk-add-confirmar ${sinGuardar ? 'pendiente' : 'guardado'}`}
                                    onClick={onConfirmar}
                                    disabled={!sinGuardar || guardando}
                                >
                                    {guardando
                                        ? 'Guardando...'
                                        : sinGuardar
                                            ? <><FiCheck size={14}/> Confirmar cambios</>
                                            : <><FiCheck size={14}/> Cambios guardados</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Categorías */}
                <div className='spk-categorias'>
                    {categorias.map(cat => (
                        <button
                            key={cat}
                            className={`spk-cat-btn ${categoriaActiva === cat ? 'activa' : ''}`}
                            onClick={() => setCategoriaActiva(cat)}
                        >
                            {cat === 'todos' ? 'Todos' : CATEGORIAS_LABEL[cat] || cat}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                <div className='spk-lista'>
                    {cargando ? (
                        <p className='spk-cargando'>Cargando servicios...</p>
                    ) : filtrados.length === 0 ? (
                        <div className='spk-vacio'>
                            {tabTipo === 'producto' ? <FiPackage size={36}/> : <FiStar size={36}/>}
                            <p>No hay {tabTipo === 'producto' ? 'productos' : 'servicios'} en esta categoría.</p>
                        </div>
                    ) : filtrados.map(servicio => {
                        const id   = servicio.id_servicio
                        const tp   = servicio.tipo_precio
                        const disp = disponibilidad[id]
                        const bloqueado  = disp && !disp.disponible
                        const enSel      = !!selMap[id]
                        const opciones   = getOpcionesTurno(servicio)
                        const opIdx      = opcionTurnoPor[id] ?? 0
                        const opSel      = opciones ? (opciones[opIdx] || opciones[0]) : null
                        // Precios de catálogo YA con la comisión del cliente incorporada
                        // (invisible), para que el monto no cambie al agregarlo al carrito.
                        const precioUnit = conCom(getPrecioUnitario(servicio))
                        const total      = conCom(calcTotal(servicio))
                        const horaInicio = horaPor[id] || ''

                        // Destacado: producto "ideal para N personas" que coincide (o está cerca) del cupo del evento
                        const cupoNum = Number(cupo) || 0
                        const idealPers = Number(servicio.ideal_para_personas) || 0
                        const tolCupo = Math.max(1, Math.round(cupoNum * 0.1))
                        const esDestacado = idealPers > 0 && cupoNum > 0 && Math.abs(idealPers - cupoNum) <= tolCupo

                        const calcFin = (inicio, h) => {
                            if (!inicio) return null
                            const [hh, mm] = inicio.split(':').map(Number)
                            const t = hh * 60 + mm + (Number(h) || 1) * 60
                            return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`
                        }

                        return (
                            <div key={id} className={`spk-card ${enSel ? 'spk-card--sel' : ''} ${bloqueado ? 'spk-card--bloqueado' : ''} ${esDestacado ? 'spk-card--destacado' : ''}`}>
                                {esDestacado && (
                                    <span className='spk-destacado-badge'>⭐ Ideal para {idealPers} personas</span>
                                )}
                                {servicio.imagen && <img src={servicio.imagen} alt={servicio.nombre} className='spk-card-img'/>}
                                <div className='spk-card-body'>
                                    <span className='spk-cat-label'>{CATEGORIAS_LABEL[servicio.categoria] || servicio.categoria}</span>
                                    <h4>{servicio.nombre}</h4>
                                    <p className='spk-desc'>{servicio.descripcion}</p>

                                    {bloqueado && <div className='spk-no-disp'>🚫 {disp.motivo}</div>}

                                    {/* Badge tipo de día */}
                                    {fechaEvento && (() => {
                                        const info = calcularPrecioServicio(servicio.precio, servicio.precios_tramos, fechaEvento, tp, 1)
                                        if (info.tipo === 'comun') return null
                                        return (
                                            <div className='spk-dia-badge' style={{ borderColor: TIPO_DIA_COLOR[info.tipo], color: TIPO_DIA_COLOR[info.tipo] }}>
                                                {TIPO_DIA_LABEL[info.tipo]}
                                                {info.precioUnitario !== Number(servicio.precio) && (
                                                    <span> · ${conCom(info.precioUnitario).toLocaleString('es-AR')}</span>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* Opciones de turno */}
                                    {opciones && tp === 'por_turno' && (
                                        <div className='spk-turno-opciones'>
                                            <span className='spk-turno-opciones-label'>Elegí el turno:</span>
                                            <div className='spk-turno-grid'>
                                                {opciones.map((op, i) => (
                                                    <button
                                                        key={i}
                                                        type='button'
                                                        className={`spk-turno-btn ${opIdx === i ? 'spk-turno-btn--active' : ''}`}
                                                        onClick={() => setOpcionTurnoPor(prev => ({ ...prev, [id]: i }))}
                                                    >
                                                        <FiClock size={11}/> {op.horas ?? '?'}h
                                                        <strong>${Number(conCom(op.precio ?? servicio.precio)).toLocaleString('es-AR')}</strong>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Horario: entretenimiento (durante el evento) y catering
                                        (p.ej. comida caliente) se eligen; el resto se entrega
                                        2-3h antes automáticamente */}
                                    {servicio.categoria === 'entretenimiento' ? (
                                        <div className='spk-hora-row'>
                                            <FiClock size={12}/>
                                            <label>Hora de inicio (durante el evento):</label>
                                            <TimePicker24
                                                value={horaInicio}
                                                onChange={v => setHoraPor(prev => ({ ...prev, [id]: v }))}
                                            />
                                            {tp === 'por_hora' && horaInicio && (
                                                <span className='spk-hora-fin'>
                                                    → {calcFin(horaInicio, horasPor[id] || 1)}
                                                </span>
                                            )}
                                        </div>
                                    ) : servicio.categoria === 'catering' ? (
                                        <div className='spk-hora-row'>
                                            <FiClock size={12}/>
                                            <label>Hora de entrega:</label>
                                            <TimePicker24
                                                value={horaInicio}
                                                onChange={v => setHoraPor(prev => ({ ...prev, [id]: v }))}
                                            />
                                            <span className='spk-entrega-auto'>
                                                {horaEvento && !horaInicio
                                                    ? <>Sugerida: <strong>{sugerirHoraServicio('catering', horaEvento)}</strong> — comida caliente puede pedirse a horario exacto</>
                                                    : <>Comida caliente puede pedirse a horario exacto</>
                                                }
                                            </span>
                                        </div>
                                    ) : (
                                        <div className='spk-hora-row spk-hora-row--auto'>
                                            <FiClock size={12}/>
                                            <span className='spk-entrega-auto'>
                                                {horaEvento
                                                    ? <>Entrega: <strong>{sugerirHoraServicio(servicio.categoria, horaEvento)}</strong> ({HORAS_ANTES[servicio.categoria] ?? 2}h antes del evento)</>
                                                    : <>Se entrega {HORAS_ANTES[servicio.categoria] ?? 2}h antes de comenzar el evento</>
                                                }
                                            </span>
                                        </div>
                                    )}

                                    {/* Precio y controles de unidades */}
                                    <div className='spk-precio-bloque'>
                                        {tp === 'por_persona' && (
                                            <span className='spk-precio-unit'>
                                                ${precioUnit.toLocaleString('es-AR')}<span className='spk-por'>/persona</span>
                                                {Number(cupo) > 0 && <> × {cupo} = <strong>${total.toLocaleString('es-AR')}</strong></>}
                                            </span>
                                        )}
                                        {tp === 'por_hora' && (
                                            <div className='spk-unidades-row'>
                                                <span className='spk-precio-unit'>${precioUnit.toLocaleString('es-AR')}<span className='spk-por'>/h</span></span>
                                                <span>×</span>
                                                <input
                                                    type='number' min='1'
                                                    value={horasPor[id] ?? 1}
                                                    onChange={e => setHorasPor(prev => ({ ...prev, [id]: e.target.value }))}
                                                    className='spk-num-input'
                                                />
                                                <span>h =</span>
                                                <strong>${total.toLocaleString('es-AR')}</strong>
                                            </div>
                                        )}
                                        {tp === 'por_turno' && !opciones && (
                                            <div className='spk-unidades-row'>
                                                <span className='spk-precio-unit'>${precioUnit.toLocaleString('es-AR')}<span className='spk-por'>/turno</span></span>
                                                <span>×</span>
                                                <input
                                                    type='number' min='1'
                                                    value={turnosPor[id] ?? 1}
                                                    onChange={e => setTurnosPor(prev => ({ ...prev, [id]: e.target.value }))}
                                                    className='spk-num-input'
                                                />
                                                <span>=</span>
                                                <strong>${total.toLocaleString('es-AR')}</strong>
                                            </div>
                                        )}
                                        {tp === 'por_turno' && opciones && opSel && (
                                            <div className='spk-unidades-row'>
                                                <strong>${Number(conCom(opSel.precio ?? servicio.precio)).toLocaleString('es-AR')}</strong>
                                                <span className='spk-por'>/ turno de {opSel.horas}h</span>
                                                <span>×</span>
                                                <input
                                                    type='number' min='1'
                                                    value={turnosPor[id] ?? 1}
                                                    onChange={e => setTurnosPor(prev => ({ ...prev, [id]: e.target.value }))}
                                                    className='spk-num-input'
                                                />
                                                <span>=</span>
                                                <strong>${(Number(conCom(opSel.precio ?? servicio.precio)) * (Number(turnosPor[id]) || 1)).toLocaleString('es-AR')}</strong>
                                            </div>
                                        )}
                                        {tp === 'fijo' && (
                                            <strong className='spk-precio-fijo'>${precioUnit.toLocaleString('es-AR')}</strong>
                                        )}
                                    </div>
                                </div>

                                {/* Botón agregar / quitar + cantidad si está seleccionado */}
                                <div className='spk-card-actions'>
                                    {enSel ? (
                                        <div className='spk-cant-row'>
                                            <button type='button' className='spk-cant-btn' onClick={() => updateCantidad(id, -1)}><FiMinus size={13}/></button>
                                            <input
                                                type='number'
                                                min='1'
                                                step='1'
                                                className='spk-cant-input'
                                                value={selMap[id].cantidad}
                                                onChange={e => setCantidad(id, e.target.value)}
                                                onFocus={e => e.target.select()}
                                                aria-label='Cantidad'
                                            />
                                            <button type='button' className='spk-cant-btn' onClick={() => updateCantidad(id, +1)}><FiPlus size={13}/></button>
                                            <button type='button' className='spk-btn-quitar' onClick={() => toggleServicio(servicio)}><FiX size={13}/> Quitar</button>
                                        </div>
                                    ) : (
                                        <div className='spk-agregar-row'>
                                            {tp !== 'por_persona' && (
                                                <input
                                                    type='number' min='1' step='1'
                                                    className='spk-cant-input spk-cant-input--lista'
                                                    value={cantidadNueva[id] ?? 1}
                                                    onChange={e => setCantidadNueva(prev => ({ ...prev, [id]: e.target.value }))}
                                                    onFocus={e => e.target.select()}
                                                    disabled={bloqueado}
                                                    aria-label='Cantidad'
                                                    title='Cantidad a agregar'
                                                />
                                            )}
                                            <button
                                                type='button'
                                                className='spk-btn-agregar'
                                                disabled={bloqueado}
                                                onClick={() => !bloqueado && toggleServicio(servicio)}
                                            >
                                                <FiPlus size={14}/> Agregar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer con resumen (en página, la navegación la pone la pantalla) */}
                {!embebido && (
                    <div className='spk-footer'>
                        {seleccionados.length > 0 ? (
                            <span className='spk-footer-resumen'>
                                {seleccionados.length} servicio{seleccionados.length !== 1 ? 's' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}
                            </span>
                        ) : (
                            <span className='spk-footer-hint'>Ningún servicio agregado aún</span>
                        )}
                        <button type='button' className='spk-btn-listo' onClick={onClose}>
                            <FiCheck size={15}/> Listo
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de requisitos de la torta */}
            {tortaModal && createPortal(
                <div className='spk-torta-overlay' onClick={e => { if (e.target === e.currentTarget) setTortaModal(null) }}>
                    <div className='spk-torta-modal'>
                        <div className='spk-torta-head'>
                            <h3>🎂 Requisitos de la torta</h3>
                            <button type='button' onClick={() => setTortaModal(null)}><FiX size={18}/></button>
                        </div>
                        <p className='spk-torta-sub'>{tortaModal.servicio?.nombre} — completá los detalles para el pastelero.</p>
                        <div className='spk-torta-body'>
                            {(() => {
                                let ficha = tortaModal.servicio?.ficha_torta
                                try { ficha = typeof ficha === 'string' ? JSON.parse(ficha) : ficha } catch { ficha = null }
                                return <FichaTortaView ficha={ficha} />
                            })()}
                            <TortaCamposForm
                                value={tortaModal.detalle}
                                cupo={cupo}
                                onChange={(d) => setTortaModal(m => ({ ...m, detalle: d }))}
                            />
                        </div>
                        <div className='spk-torta-foot'>
                            <button type='button' className='spk-torta-cancelar' onClick={() => setTortaModal(null)}>Cancelar</button>
                            <button type='button' className='spk-torta-confirmar' onClick={confirmarTorta}>
                                <FiCheck size={15}/> {tortaModal.editId ? 'Guardar' : 'Agregar torta'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default ServiciosPicker
