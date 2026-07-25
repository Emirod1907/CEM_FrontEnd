import React, { useEffect, useState } from 'react'
import { getServicios, getDisponibilidadServicios } from '../../../services/servicioServices'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { FiX, FiPlus, FiCheck, FiUsers, FiClock, FiRepeat, FiPackage, FiStar } from 'react-icons/fi'
import { calcularPrecioServicio, TIPO_DIA_LABEL, TIPO_DIA_COLOR } from '../../../utils/preciosUtils'
import { sugerirHoraServicio, HORAS_ANTES, CATEGORIAS_HORA_EDITABLE } from '../../ServiciosPicker/ServiciosPicker'
import TimePicker24 from '../../TimePicker24/TimePicker24'
import './ServiciosModal.css'

const CATEGORIAS_LABEL = {
    catering:       'Catering',
    decoracion:     'Decoración',
    audio_video:    'Audio y Video',
    seguridad:      'Seguridad',
    personal:       'Provisión de Personal',
    mobiliario:     'Mobiliario',
    entretenimiento:'Entretenimiento',
    tortas:         'Tortas a pedido',
    bebidas:        'Bebidas',
    comida:         'Alimentos',
    alimentos:      'Alimentos',
    cotillon:       'Cotillón y Souvenirs',
    vajilla:        'Vajilla',
    otro:           'Otros'
}

const ServiciosModal = ({ onClose }) => {
    const {
        serviciosCarrito,
        agregarServicioAdicional,
        numInvitados,
        setNumInvitados,
        invitadosEfectivos,
        reservaOrganizador
    } = useCarrito()

    const [servicios, setServicios] = useState([])
    const [cargando, setCargando] = useState(true)
    const [tabTipo, setTabTipo] = useState('producto')
    const [categoriaActiva, setCategoriaActiva] = useState('todos')
    const [agregados, setAgregados] = useState({})
    const [horasPorServicio, setHorasPorServicio] = useState({})
    const [turnosPorServicio, setTurnosPorServicio] = useState({})
    const [horaInicioPorServicio, setHoraInicioPorServicio] = useState({})
    const [opcionTurnoPorServicio, setOpcionTurnoPorServicio] = useState({})
    // tramoPorServicio ya no se necesita — el precio se calcula automáticamente por fecha
    const [disponibilidad, setDisponibilidad] = useState({})

    const cupoEvento = Number(reservaOrganizador?.datos_evento?.cupo) || 0
    const fechaEvento = reservaOrganizador?.fecha
        ? String(reservaOrganizador.fecha).slice(0, 10)
        : null
    const horaEvento    = reservaOrganizador?.datos_evento?.hora_inicio || null
    const horaFinEvento = reservaOrganizador?.datos_evento?.hora_fin || null

    useEffect(() => {
        const cargar = async () => {
            const data = await getServicios()
            setServicios(data)
            setCargando(false)
        }
        cargar()
    }, [])

    useEffect(() => {
        if (!fechaEvento) return
        const consultar = async () => {
            const lista = await getDisponibilidadServicios(fechaEvento, invitadosEfectivos || 0)
            const mapa = {}
            for (const item of lista) mapa[item.id_servicio] = item
            setDisponibilidad(mapa)
        }
        consultar()
    }, [fechaEvento, invitadosEfectivos])

    // Filtrar por tipo y categoría
    const serviciosPorTipo = servicios.filter(s => (s.tipo_item || 'producto') === tabTipo)
    const categorias = ['todos', ...new Set(serviciosPorTipo.map(s => s.categoria))]
    const serviciosFiltrados = categoriaActiva === 'todos'
        ? serviciosPorTipo
        : serviciosPorTipo.filter(s => s.categoria === categoriaActiva)

    // Reset categoría al cambiar tab
    const cambiarTab = (tipo) => {
        setTabTipo(tipo)
        setCategoriaActiva('todos')
    }

    const enCarrito = (id_servicio) =>
        serviciosCarrito.some(s => s.id_servicio === id_servicio)

    const getHoras  = (id) => Number(horasPorServicio[id])  || 1
    const getTurnos = (id) => Number(turnosPorServicio[id]) || 1
    const getHoraInicio = (id) => horaInicioPorServicio[id] || ''
    const getOpcionTurno = (id) => opcionTurnoPorServicio[id] ?? 0

    const getOpcionesTurno = (servicio) => {
        try {
            const v = servicio.precios_tramos
            const cfg = v ? (typeof v === 'string' ? JSON.parse(v) : v) : null
            return Array.isArray(cfg?.opciones_turno) && cfg.opciones_turno.length > 0 ? cfg.opciones_turno : null
        } catch { return null }
    }

    // Precio unitario ajustado por fecha del evento (fin_semana / feriado override)
    const getPrecioBase = (servicio) => {
        // Si hay opciones de turno, el precio es el de la opción seleccionada
        const opciones = getOpcionesTurno(servicio)
        if (opciones && servicio.tipo_precio === 'por_turno') {
            const idx = getOpcionTurno(servicio.id_servicio)
            const op = opciones[idx] || opciones[0]
            return Number(op?.precio ?? servicio.precio) || 0
        }
        const info = calcularPrecioServicio(
            servicio.precio,
            servicio.precios_tramos,
            fechaEvento || '',
            servicio.tipo_precio,
            1
        )
        return info.precioUnitario
    }

    const handleAgregar = (servicio) => {
        const id = servicio.id_servicio
        const opciones = getOpcionesTurno(servicio)
        const opcionIdx = getOpcionTurno(id)
        const opcionSeleccionada = opciones ? (opciones[opcionIdx] || opciones[0]) : null
        const horas  = opcionSeleccionada?.horas ?? getHoras(id)
        const turnos = getTurnos(id)
        // Entretenimiento y catering: horario elegible por el usuario
        // (entretenimiento durante el evento; catering p.ej. comida caliente).
        // Resto: entrega automática 2-3h antes del inicio del evento.
        const horaEditable = CATEGORIAS_HORA_EDITABLE.includes(servicio.categoria)
        const entretenimientoYa = serviciosCarrito.filter(s => s.categoria === 'entretenimiento').length
        const horaAuto = sugerirHoraServicio(servicio.categoria, horaEvento || '', entretenimientoYa)
        const horaManual = horaEditable ? (getHoraInicio(id) || null) : null
        const hora_inicio = horaManual || horaAuto || null
        const precioUnitario = getPrecioBase(servicio)
        agregarServicioAdicional({
            ...servicio,
            precio: precioUnitario,
            horas, turnos, hora_inicio,
            hora_manual: !!horaManual,
            tramo: null,
        })
        setAgregados(prev => ({ ...prev, [id]: true }))
        setTimeout(() => setAgregados(prev => ({ ...prev, [id]: false })), 1500)
    }

    const precioEfectivo = (servicio) => {
        const base = getPrecioBase(servicio)
        if (servicio.tipo_precio === 'por_persona') return base * (invitadosEfectivos > 0 ? invitadosEfectivos : 1)
        if (servicio.tipo_precio === 'por_hora')    return base * getHoras(servicio.id_servicio)
        if (servicio.tipo_precio === 'por_turno')   return base * getTurnos(servicio.id_servicio)
        return base
    }

    // Calcula hora de fin dado inicio y cantidad de horas
    const calcularHoraFin = (horaInicio, horas) => {
        if (!horaInicio) return null
        const [h, m] = horaInicio.split(':').map(Number)
        const total = h * 60 + m + Number(horas || 1) * 60
        return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }

    const hayPorPersona = serviciosPorTipo.some(s => s.tipo_precio === 'por_persona')
    const nProductos = servicios.filter(s => (s.tipo_item || 'producto') === 'producto').length
    const nServicios = servicios.filter(s => s.tipo_item === 'servicio').length

    return (
        <div className='servicios-overlay' onClick={onClose}>
            <div className='servicios-modal' onClick={e => e.stopPropagation()}>
                <div className='servicios-modal-header'>
                    <h2>Servicios Adicionales</h2>
                    <button className='servicios-cerrar' onClick={onClose}>
                        <FiX size={22} />
                    </button>
                </div>

                {/* Tabs Producto / Servicio */}
                <div className='sm-tipo-tabs'>
                    <button
                        className={`sm-tipo-tab ${tabTipo === 'producto' ? 'active' : ''}`}
                        onClick={() => cambiarTab('producto')}
                    >
                        <FiPackage size={14}/> Productos
                        {nProductos > 0 && <span className='sm-tipo-count'>{nProductos}</span>}
                    </button>
                    <button
                        className={`sm-tipo-tab ${tabTipo === 'servicio' ? 'active' : ''}`}
                        onClick={() => cambiarTab('servicio')}
                    >
                        <FiStar size={14}/> Servicios
                        {nServicios > 0 && <span className='sm-tipo-count'>{nServicios}</span>}
                    </button>
                </div>

                {/* Barra de invitados — solo si hay servicios por persona en el tab activo */}
                {hayPorPersona && (
                    <div className='servicios-invitados-bar'>
                        <FiUsers size={16} />
                        <label htmlFor='modal-invitados'>Invitados:</label>
                        <input
                            id='modal-invitados'
                            type='number'
                            min='1'
                            value={numInvitados}
                            onChange={e => setNumInvitados(e.target.value)}
                            placeholder={cupoEvento > 0 ? String(cupoEvento) : '0'}
                            className='invitados-input'
                        />
                        {cupoEvento > 0 && (
                            <button
                                className='btn-usar-cupo'
                                onClick={() => setNumInvitados(String(cupoEvento))}
                                title='Usar cupo del evento'
                            >
                                Usar cupo ({cupoEvento})
                            </button>
                        )}
                        <span className='invitados-hint'>
                            Los precios <em>por persona</em> se calculan × {invitadosEfectivos > 0 ? invitadosEfectivos : '?'}
                        </span>
                    </div>
                )}

                {/* Categorías filtro */}
                <div className='servicios-categorias'>
                    {categorias.map(cat => (
                        <button
                            key={cat}
                            className={`cat-btn ${categoriaActiva === cat ? 'activa' : ''}`}
                            onClick={() => setCategoriaActiva(cat)}
                        >
                            {cat === 'todos' ? 'Todos' : CATEGORIAS_LABEL[cat] || cat}
                        </button>
                    ))}
                </div>

                <div className='servicios-lista'>
                    {cargando ? (
                        <p className='servicios-cargando'>Cargando servicios...</p>
                    ) : serviciosFiltrados.length === 0 ? (
                        <div className='sm-vacio'>
                            {tabTipo === 'producto' ? <FiPackage size={40}/> : <FiStar size={40}/>}
                            <p>No hay {tabTipo === 'producto' ? 'productos' : 'servicios'} disponibles en esta categoría</p>
                        </div>
                    ) : (
                        serviciosFiltrados.map(servicio => {
                            const id = servicio.id_servicio
                            const tp = servicio.tipo_precio
                            const disp = disponibilidad[id]
                            const noDisponible = disp && !disp.disponible
                            const esServicioPorHora = tp === 'por_hora' && (servicio.tipo_item || 'producto') === 'servicio'
                            const horaInicio = getHoraInicio(id)
                            const horaFin = esServicioPorHora ? calcularHoraFin(horaInicio, getHoras(id)) : null

                            return (
                                <div key={id} className={`servicio-card ${noDisponible ? 'servicio-card--bloqueado' : ''}`}>
                                    {servicio.imagen && (
                                        <img src={servicio.imagen} alt={servicio.nombre} className='servicio-img' />
                                    )}
                                    <div className='servicio-info'>
                                        <span className='servicio-categoria'>
                                            {CATEGORIAS_LABEL[servicio.categoria] || servicio.categoria}
                                        </span>
                                        <h4>{servicio.nombre}</h4>
                                        {noDisponible && (
                                            <div className='servicio-no-disp'>🚫 {disp.motivo}</div>
                                        )}
                                        {!noDisponible && disp?.aviso && (
                                            <div className='servicio-aviso'>⏳ {disp.aviso}</div>
                                        )}
                                        {!noDisponible && !disp?.aviso && disp?.capacidad_restante != null && (
                                            <div className='servicio-capacidad'>
                                                ✅ {disp.capacidad_restante} lugar{disp.capacidad_restante !== 1 ? 'es' : ''} disponible{disp.capacidad_restante !== 1 ? 's' : ''}
                                            </div>
                                        )}

                                        {/* Horario disponible del servicio */}
                                        {(servicio.tipo_item || 'producto') === 'servicio' && (servicio.horario_inicio || servicio.horario_fin) && (
                                            <div className='servicio-horario-disp'>
                                                <FiClock size={11}/>
                                                {servicio.horario_inicio && servicio.horario_fin
                                                    ? `Disponible de ${servicio.horario_inicio} a ${servicio.horario_fin}`
                                                    : servicio.horario_inicio
                                                        ? `Desde ${servicio.horario_inicio}`
                                                        : `Hasta ${servicio.horario_fin}`
                                                }
                                            </div>
                                        )}

                                        <p>{servicio.descripcion}</p>

                                        {/* Badge: precio ajustado por tipo de día del evento */}
                                        {fechaEvento && (() => {
                                            const info = calcularPrecioServicio(servicio.precio, servicio.precios_tramos, fechaEvento, servicio.tipo_precio, 1)
                                            if (info.tipo === 'comun') return null
                                            return (
                                                <div className='sm-precio-dia-badge' style={{ borderColor: TIPO_DIA_COLOR[info.tipo], color: TIPO_DIA_COLOR[info.tipo] }}>
                                                    {TIPO_DIA_LABEL[info.tipo]}
                                                    {info.precioUnitario !== Number(servicio.precio) && (
                                                        <span className='sm-precio-dia-override'>
                                                            · Precio: ${info.precioUnitario.toLocaleString('es-AR')}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })()}

                                        {/* Horario: entretenimiento (durante el evento) y catering
                                            (p.ej. comida caliente) se eligen; el resto se entrega
                                            2-3h antes automáticamente */}
                                        {servicio.categoria === 'entretenimiento' ? (
                                            <div className='servicio-hora-inicio-bloque'>
                                                <div className='hora-inicio-row'>
                                                    <FiClock size={13}/>
                                                    <label>Hora de inicio (durante el evento):</label>
                                                    <TimePicker24
                                                        value={horaInicio}
                                                        onChange={v => setHoraInicioPorServicio(prev => ({ ...prev, [id]: v }))}
                                                    />
                                                </div>
                                                {esServicioPorHora && horaInicio && horaFin && (
                                                    <div className='hora-rango-preview'>
                                                        De {horaInicio} a {horaFin} ({getHoras(id)}h)
                                                    </div>
                                                )}
                                            </div>
                                        ) : servicio.categoria === 'catering' ? (
                                            <div className='servicio-hora-inicio-bloque'>
                                                <div className='hora-inicio-row'>
                                                    <FiClock size={13}/>
                                                    <label>Hora de entrega:</label>
                                                    <TimePicker24
                                                        value={horaInicio}
                                                        onChange={v => setHoraInicioPorServicio(prev => ({ ...prev, [id]: v }))}
                                                    />
                                                </div>
                                                <div className='hora-rango-preview'>
                                                    {horaEvento && !horaInicio
                                                        ? <>Sugerida: {sugerirHoraServicio('catering', horaEvento)} — comida caliente puede pedirse a horario exacto</>
                                                        : <>Comida caliente puede pedirse a horario exacto</>
                                                    }
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='servicio-hora-inicio-bloque'>
                                                <div className='hora-inicio-row hora-inicio-row--auto'>
                                                    <FiClock size={13}/>
                                                    <span className='hora-entrega-auto'>
                                                        {horaEvento
                                                            ? <>Entrega: <strong>{sugerirHoraServicio(servicio.categoria, horaEvento)}</strong> ({HORAS_ANTES[servicio.categoria] ?? 2}h antes del evento)</>
                                                            : <>Se entrega {HORAS_ANTES[servicio.categoria] ?? 2}h antes de comenzar el evento</>
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Precio según tipo */}
                                        {tp === 'por_persona' && (
                                            <div className='servicio-precio-bloque'>
                                                <span className='servicio-precio-base'>
                                                    ${getPrecioBase(servicio).toLocaleString('es-AR')}<span className='por-unidad'>/persona</span>
                                                </span>
                                                {invitadosEfectivos > 0 && (
                                                    <strong className='servicio-precio-total'>
                                                        = ${precioEfectivo(servicio).toLocaleString('es-AR')} total
                                                        <span className='precio-total-nota'>({invitadosEfectivos} inv.)</span>
                                                    </strong>
                                                )}
                                            </div>
                                        )}

                                        {tp === 'por_hora' && (
                                            <div className='servicio-precio-bloque'>
                                                <span className='servicio-precio-base'>
                                                    ${getPrecioBase(servicio).toLocaleString('es-AR')}<span className='por-unidad'>/hora</span>
                                                </span>
                                                <div className='selector-unidades'>
                                                    <FiClock size={13} />
                                                    <label>Horas:</label>
                                                    <input
                                                        type='number'
                                                        min='1'
                                                        value={horasPorServicio[id] ?? 1}
                                                        onChange={e => setHorasPorServicio(prev => ({ ...prev, [id]: e.target.value }))}
                                                        className='unidades-input'
                                                    />
                                                    <strong className='servicio-precio-total'>
                                                        = ${precioEfectivo(servicio).toLocaleString('es-AR')}
                                                    </strong>
                                                </div>
                                            </div>
                                        )}

                                        {tp === 'por_turno' && (() => {
                                            const opciones = getOpcionesTurno(servicio)
                                            const opIdx    = getOpcionTurno(id)
                                            const opSel    = opciones ? (opciones[opIdx] || opciones[0]) : null
                                            // Backward compat: old single duracion_turno
                                            const cfg = (() => { try { const v = servicio.precios_tramos; return v ? (typeof v === 'string' ? JSON.parse(v) : v) : null } catch { return null } })()
                                            const duracion = opSel?.horas ?? cfg?.duracion_turno
                                            return (
                                                <div className='servicio-precio-bloque'>
                                                    {/* Selector de opciones de turno */}
                                                    {opciones ? (
                                                        <div className='sm-turno-opciones'>
                                                            <span className='sm-turno-opciones-label'>Elegí el turno:</span>
                                                            <div className='sm-turno-opciones-grid'>
                                                                {opciones.map((op, i) => (
                                                                    <button
                                                                        key={i}
                                                                        type='button'
                                                                        className={`sm-turno-opcion-btn ${opIdx === i ? 'sm-turno-opcion-btn--active' : ''}`}
                                                                        onClick={() => setOpcionTurnoPorServicio(prev => ({ ...prev, [id]: i }))}
                                                                    >
                                                                        <span className='sm-top-horas'><FiClock size={11}/> {op.horas ?? '?'}h</span>
                                                                        <span className='sm-top-precio'>${Number(op.precio ?? servicio.precio).toLocaleString('es-AR')}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className='servicio-precio-base'>
                                                            ${getPrecioBase(servicio).toLocaleString('es-AR')}<span className='por-unidad'>/turno</span>
                                                            {duracion && <span className='turno-duracion-badge'><FiClock size={10}/> {duracion}h c/u</span>}
                                                        </span>
                                                    )}
                                                    <div className='selector-unidades'>
                                                        <FiRepeat size={13} />
                                                        <label>Turnos:</label>
                                                        <input
                                                            type='number'
                                                            min='1'
                                                            value={turnosPorServicio[id] ?? 1}
                                                            onChange={e => setTurnosPorServicio(prev => ({ ...prev, [id]: e.target.value }))}
                                                            className='unidades-input'
                                                        />
                                                        <strong className='servicio-precio-total'>
                                                            = ${precioEfectivo(servicio).toLocaleString('es-AR')}
                                                            {duracion && getTurnos(id) > 0 && (
                                                                <span className='turno-total-horas'> ({duracion * getTurnos(id)}h)</span>
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>
                                            )
                                        })()}

                                        {tp === 'fijo' && (
                                            <strong className='servicio-precio'>
                                                ${getPrecioBase(servicio).toLocaleString('es-AR')}
                                            </strong>
                                        )}
                                    </div>

                                    <button
                                        className={`btn-agregar-servicio ${enCarrito(id) ? 'en-carrito' : ''} ${noDisponible ? 'btn-agregar-bloqueado' : ''}`}
                                        onClick={() => !noDisponible && handleAgregar(servicio)}
                                        disabled={noDisponible}
                                        title={noDisponible ? disp.motivo : undefined}
                                    >
                                        {agregados[id]
                                            ? <><FiCheck size={16} /> Agregado</>
                                            : enCarrito(id)
                                                ? <><FiPlus size={16} /> Agregar más</>
                                                : <><FiPlus size={16} /> Agregar</>
                                        }
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className='servicios-modal-footer'>
                    <button className='btn-cerrar-servicios' onClick={onClose}>
                        Listo
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ServiciosModal
