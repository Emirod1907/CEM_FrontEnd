import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompare } from '../../../Contexts/CompareContextProvider'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { FiX, FiCalendar, FiShoppingCart, FiTrash2, FiBookmark } from 'react-icons/fi'
import { precioTipoDia } from '../../../utils/preciosUtils'
import './ComparacionModal.css'

const parsearJSON = (v) => {
    if (!v) return []
    if (Array.isArray(v)) return v
    try { return JSON.parse(v) } catch { return [] }
}

const parsePreciosConfig = (v) => {
    if (!v) return null
    try { const p = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(p) ? null : p }
    catch { return null }
}

const Check = ({ ok }) => (
    <span className={`cmp-check ${ok ? 'cmp-check--si' : 'cmp-check--no'}`}>
        {ok ? '✓' : '—'}
    </span>
)

// ── Tabla de salones ──────────────────────────────────────────────────────────

const TablaSalones = ({ salones, onQuitar, onReservar }) => {
    if (salones.length === 0) return (
        <div className='cmp-vacio'>
            <p>No hay salones en la comparación.</p>
            <p className='cmp-vacio-hint'>Cerrá este panel y usá el botón <strong>Comparar</strong> en cada salón.</p>
        </div>
    )

    const filas = [
        {
            label: 'Imagen',
            render: s => s.imagen
                ? <img src={s.imagen} alt={s.nombre} className='cmp-salon-img'/>
                : <span className='cmp-nd'>Sin imagen</span>
        },
        {
            label: 'Ubicación',
            render: s => (
                <span className='cmp-ubicacion'>
                    {[s.domicilio, s.localidad, s.departamento].filter(Boolean).join(', ') || '—'}
                </span>
            )
        },
        {
            label: 'Aforo',
            render: s => <strong>{s.aforo ? `${Number(s.aforo).toLocaleString('es-AR')} personas` : '—'}</strong>
        },
        {
            label: 'Precio',
            render: s => {
                const p = s.precio_publico ?? s.precio_alquiler
                return p
                    ? <strong className='cmp-precio'>${Number(p).toLocaleString('es-AR')}</strong>
                    : <span className='cmp-nd'>A consultar</span>
            }
        },
        {
            label: 'Precio fin de semana',
            render: s => {
                const base = s.precio_publico ?? s.precio_alquiler
                const p = precioTipoDia(base, s.precios_config, 'fin_semana')
                return p != null
                    ? <strong className='cmp-precio cmp-precio--alt'>${Number(p).toLocaleString('es-AR')}</strong>
                    : <span className='cmp-nd'>—</span>
            }
        },
        {
            label: 'Precio feriados',
            render: s => {
                const base = s.precio_publico ?? s.precio_alquiler
                const p = precioTipoDia(base, s.precios_config, 'feriado')
                return p != null
                    ? <strong className='cmp-precio cmp-precio--alt'>${Number(p).toLocaleString('es-AR')}</strong>
                    : <span className='cmp-nd'>—</span>
            }
        },
        {
            label: 'Cobra por hora',
            render: s => {
                const cfg = parsePreciosConfig(s.precios_config)
                return <Check ok={!!cfg?.por_hora}/>
            }
        },
        {
            label: 'Servicios incluidos',
            render: s => {
                const lista = parsearJSON(s.servicios_incluidos)
                return lista.length > 0
                    ? <div className='cmp-tags'>{lista.map((t, i) => <span key={i} className='cmp-tag cmp-tag--serv'>{t}</span>)}</div>
                    : <span className='cmp-nd'>—</span>
            }
        },
        {
            label: 'Tipos de evento',
            render: s => {
                const lista = parsearJSON(s.tipos_evento)
                return lista.length > 0
                    ? <div className='cmp-tags'>{lista.map((t, i) => <span key={i} className='cmp-tag cmp-tag--tipo'>{t}</span>)}</div>
                    : <span className='cmp-nd'>—</span>
            }
        },
        {
            label: 'Departamento',
            render: s => s.departamento || <span className='cmp-nd'>—</span>
        },
    ]

    return (
        <div className='cmp-tabla-wrapper'>
            <table className='cmp-tabla'>
                <thead>
                    <tr>
                        <th className='cmp-th-label'></th>
                        {salones.map(s => (
                            <th key={s.id_bodega} className='cmp-th-salon'>
                                <div className='cmp-th-header'>
                                    <span className='cmp-th-nombre'>{s.nombre}</span>
                                    <button
                                        className='cmp-th-quitar'
                                        onClick={() => onQuitar(s.id_bodega)}
                                        title='Quitar de la comparación'
                                    >
                                        <FiX size={13}/>
                                    </button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filas.map((fila, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'cmp-tr-par' : 'cmp-tr-impar'}>
                            <td className='cmp-td-label'>{fila.label}</td>
                            {salones.map(s => (
                                <td key={s.id_bodega} className='cmp-td'>{fila.render(s)}</td>
                            ))}
                        </tr>
                    ))}
                    {/* Fila de acción */}
                    <tr className='cmp-tr-accion'>
                        <td className='cmp-td-label'>Acción</td>
                        {salones.map(s => (
                            <td key={s.id_bodega} className='cmp-td'>
                                <button className='cmp-btn-reservar' onClick={() => onReservar(s)}>
                                    <FiCalendar size={14}/> Reservar
                                </button>
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

// ── Tabla de eventos ──────────────────────────────────────────────────────────

const TablaEventos = ({ eventos, onQuitar, onAgregar, onReservarBorrador }) => {
    if (eventos.length === 0) return (
        <div className='cmp-vacio'>
            <p>No hay eventos en la comparación.</p>
            <p className='cmp-vacio-hint'>
                En la lista de eventos usá <strong>Comparar</strong>, o desde el formulario de evento usá <strong>Agregar para comparar</strong>.
            </p>
        </div>
    )

    // Mostrar la fila de alquiler solo si algún borrador la tiene
    const hayAlquiler = eventos.some(e => e._esBorrador && e._precioAlquiler != null)

    const filas = [
        {
            label: 'Tipo',
            render: e => e._esBorrador
                ? <span className='cmp-tag cmp-tag--borrador'><FiBookmark size={10}/> Borrador</span>
                : <span className='cmp-tag cmp-tag--publico'>Publicado</span>
        },
        {
            label: 'Imagen',
            render: e => e.imagen
                ? <img src={e.imagen} alt={e.nombre} className='cmp-salon-img'/>
                : <span className='cmp-nd'>Sin imagen</span>
        },
        {
            label: 'Salón',
            render: e => {
                const nombre = e.Salon?.nombre || e.bodega_nombre || e.salon
                return nombre ? <strong>{nombre}</strong> : <span className='cmp-nd'>—</span>
            }
        },
        {
            label: 'Fecha',
            render: e => e.fecha
                ? <strong>{new Date(e.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
                : <span className='cmp-nd'>—</span>
        },
        {
            label: 'Horario',
            render: e => {
                const inicio = e.datos_evento?.hora_inicio || e.hora_inicio
                const fin    = e.datos_evento?.hora_fin    || e.hora_fin
                if (!inicio && !fin) return <span className='cmp-nd'>—</span>
                return <span>{inicio && fin ? `${inicio} – ${fin}` : inicio ? `Desde ${inicio}` : `Hasta ${fin}`}</span>
            }
        },
        {
            label: 'Descripción',
            render: e => <span className='cmp-descripcion'>{e.descripcion || '—'}</span>
        },
        {
            label: 'Cupo',
            render: e => e.cupo
                ? <strong>{Number(e.cupo).toLocaleString('es-AR')} personas</strong>
                : <span className='cmp-nd'>—</span>
        },
        ...(hayAlquiler ? [{
            label: 'Alquiler estimado',
            render: e => e._precioAlquiler != null
                ? <strong className='cmp-precio'>${Number(e._precioAlquiler).toLocaleString('es-AR')}</strong>
                : <span className='cmp-nd'>—</span>
        }] : []),
        {
            label: 'Precio entrada',
            render: e => Number(e.precio) > 0
                ? <strong className='cmp-precio'>${Number(e.precio).toLocaleString('es-AR')}</strong>
                : <span className='cmp-tag cmp-tag--libre'>Entrada libre</span>
        },
        {
            label: 'Visibilidad',
            render: e => (
                <span className={`cmp-tag ${e.es_publico ? 'cmp-tag--publico' : 'cmp-tag--privado'}`}>
                    {e.es_publico ? '🌐 Público' : '🔒 Privado'}
                </span>
            )
        },
    ]

    return (
        <div className='cmp-tabla-wrapper'>
            <table className='cmp-tabla'>
                <thead>
                    <tr>
                        <th className='cmp-th-label'></th>
                        {eventos.map(e => (
                            <th key={e.id_evento} className='cmp-th-salon'>
                                <div className='cmp-th-header'>
                                    <span className='cmp-th-nombre'>{e.nombre}</span>
                                    <button
                                        className='cmp-th-quitar'
                                        onClick={() => onQuitar(e.id_evento)}
                                        title='Quitar de la comparación'
                                    >
                                        <FiX size={13}/>
                                    </button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filas.map((fila, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'cmp-tr-par' : 'cmp-tr-impar'}>
                            <td className='cmp-td-label'>{fila.label}</td>
                            {eventos.map(e => (
                                <td key={e.id_evento} className='cmp-td'>{fila.render(e)}</td>
                            ))}
                        </tr>
                    ))}
                    {/* Fila de acción */}
                    <tr className='cmp-tr-accion'>
                        <td className='cmp-td-label'>Acción</td>
                        {eventos.map(e => (
                            <td key={e.id_evento} className='cmp-td'>
                                {e._esBorrador ? (
                                    <button className='cmp-btn-reservar' onClick={() => onReservarBorrador(e)}>
                                        <FiCalendar size={14}/> Reservar este
                                    </button>
                                ) : Number(e.precio) > 0 ? (
                                    <button className='cmp-btn-reservar' onClick={() => onAgregar(e)}>
                                        <FiShoppingCart size={14}/> Agregar entrada
                                    </button>
                                ) : (
                                    <span className='cmp-nd'>Libre</span>
                                )}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

// ── Modal principal ───────────────────────────────────────────────────────────

const ComparacionModal = () => {
    const navigate = useNavigate()
    const {
        salonesComparar, quitarSalonComparar, limpiarSalonesComparar,
        eventosComparar, quitarEventoComparar, limpiarEventosComparar,
        mostrarComparacion, setMostrarComparacion,
        tabComparacion, setTabComparacion,
    } = useCompare()
    const { agregarItem } = useCarrito()

    if (!mostrarComparacion) return null

    const handleReservarSalon = (salon) => {
        setMostrarComparacion(false)
        navigate('/eventos/new', { state: { salon } })
    }

    const handleAgregarEvento = (evento) => {
        agregarItem(evento)
        setMostrarComparacion(false)
    }

    // Cuando el usuario elige "Reservar este" desde un borrador, vuelve al form con los datos pre-cargados
    const handleReservarBorrador = (borrador) => {
        setMostrarComparacion(false)
        navigate('/eventos/new', {
            state: {
                salon: borrador._salonObj || null,
                _formState: borrador._formState || null,
            }
        })
    }

    const totalSalones = salonesComparar.length
    const totalEventos = eventosComparar.length

    return (
        <div className='cmp-overlay' onClick={() => setMostrarComparacion(false)}>
            <div className='cmp-modal' onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className='cmp-header'>
                    <div className='cmp-header-left'>
                        <h2>Comparación</h2>
                        <span className='cmp-header-hint'>Analizá y elegí la mejor opción</span>
                    </div>
                    <button className='cmp-cerrar' onClick={() => setMostrarComparacion(false)}>
                        <FiX size={22}/>
                    </button>
                </div>

                {/* Tabs */}
                <div className='cmp-tabs'>
                    <button
                        className={`cmp-tab ${tabComparacion === 'salones' ? 'cmp-tab--active' : ''}`}
                        onClick={() => setTabComparacion('salones')}
                    >
                        Salones
                        {totalSalones > 0 && <span className='cmp-tab-badge'>{totalSalones}</span>}
                    </button>
                    <button
                        className={`cmp-tab ${tabComparacion === 'eventos' ? 'cmp-tab--active' : ''}`}
                        onClick={() => setTabComparacion('eventos')}
                    >
                        Eventos
                        {totalEventos > 0 && <span className='cmp-tab-badge'>{totalEventos}</span>}
                    </button>

                    {/* Limpiar tab activo */}
                    {((tabComparacion === 'salones' && totalSalones > 0) ||
                      (tabComparacion === 'eventos' && totalEventos > 0)) && (
                        <button
                            className='cmp-limpiar-btn'
                            onClick={() => tabComparacion === 'salones' ? limpiarSalonesComparar() : limpiarEventosComparar()}
                        >
                            <FiTrash2 size={13}/> Limpiar
                        </button>
                    )}
                </div>

                {/* Contenido */}
                <div className='cmp-body'>
                    {tabComparacion === 'salones' ? (
                        <TablaSalones
                            salones={salonesComparar}
                            onQuitar={quitarSalonComparar}
                            onReservar={handleReservarSalon}
                        />
                    ) : (
                        <TablaEventos
                            eventos={eventosComparar}
                            onQuitar={quitarEventoComparar}
                            onAgregar={handleAgregarEvento}
                            onReservarBorrador={handleReservarBorrador}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default ComparacionModal
