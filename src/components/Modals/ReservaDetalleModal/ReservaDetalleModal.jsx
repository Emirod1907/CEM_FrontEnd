import React, { useEffect, useState } from 'react'
import { getReservaDetalle } from '../../../services/reservaServices'
import { InvitacionesPanel } from '../InvitacionesModal/InvitacionesModal'
import PozoPanel from '../PozoPanel/PozoPanel'
import { precioUnitarioConDescuento } from '../../../utils/preciosUtils'
import {
    FiX, FiCalendar, FiMapPin, FiUsers, FiDollarSign,
    FiClock, FiFileText, FiCheckCircle, FiXCircle,
    FiAlertCircle, FiTag, FiPackage, FiHome, FiPlus, FiRefreshCw, FiBookmark, FiArrowRight
} from 'react-icons/fi'
import './ReservaDetalleModal.css'

const ESTADO_RESERVA = {
    pendiente_pago: { label: 'Pendiente de pago', clase: 'badge-pendiente' },
    seña_abonada:   { label: 'Seña abonada',      clase: 'badge-sena' },
    confirmada:     { label: 'Confirmada',         clase: 'badge-confirmada' },
    cancelada:      { label: 'Cancelada',          clase: 'badge-cancelada' },
}

const ESTADO_ORDEN = {
    pendiente:  { label: 'Pendiente',  icono: <FiClock size={12} />,       clase: 'orden-pendiente' },
    aprobado:   { label: 'Aprobado',   icono: <FiCheckCircle size={12} />, clase: 'orden-aprobado' },
    rechazado:  { label: 'Rechazado',  icono: <FiXCircle size={12} />,     clase: 'orden-rechazado' },
    cancelado:  { label: 'Cancelado',  icono: <FiXCircle size={12} />,     clase: 'orden-cancelado' },
}

const CATEGORIA_LABEL = {
    catering:       'Catering',
    decoracion:     'Decoración',
    audio_video:    'Audio y Video',
    seguridad:      'Seguridad',
    personal:       'Provisión de Personal',
    mobiliario:     'Mobiliario',
    entretenimiento:'Entretenimiento',
    tortas:         'Elaboración de Tortas',
    bebidas:        'Bebidas',
    comida:         'Alimentos',
    alimentos:      'Alimentos',
    cotillon:       'Cotillón y Souvenirs',
    vajilla:        'Vajilla',
    otro:           'Otro',
}

const TIPO_PRECIO_LABEL = {
    fijo:       'precio fijo',
    por_persona: 'por persona',
    por_hora:   'por hora',
    por_turno:  'por turno',
}

// Misma lógica que CarritoContextProvider
// invitados: numInvitados guardado en datos_evento, con fallback al cupo del evento
const calcSubtotal = (s, invitados = 0) => {
    let multiplicador = 1
    if      (s.tipo_precio === 'por_persona') multiplicador = Number(s.personas) > 0 ? Number(s.personas) : (invitados > 0 ? invitados : 1)
    else if (s.tipo_precio === 'por_hora')    multiplicador = Number(s.horas)  > 0 ? Number(s.horas)  : 1
    else if (s.tipo_precio === 'por_turno')   multiplicador = Number(s.turnos) > 0 ? Number(s.turnos) : 1
    return precioUnitarioConDescuento(s) * (Number(s.cantidad) || 1) * multiplicador
}

const fmt     = (n) => Number(n).toLocaleString('es-AR')
const fmtFecha = (f) => f
    ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '—'
const fmtFechaHora = (f) => f
    ? new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

/* ── Componente de tab ── */
const TABS_BASE = ['Evento', 'Salón', 'Servicios', 'Pagos']

const ReservaDetalleModal = ({ id_reserva, onClose, onReiterar, onGuardar, onContinuar }) => {
    const [datos, setDatos]         = useState(null)
    const [cargando, setCargando]   = useState(true)
    const [error, setError]         = useState(null)
    const [tabActiva, setTabActiva] = useState('Evento')

    const cargarDetalle = () => {
        setCargando(true)
        getReservaDetalle(id_reserva)
            .then(setDatos)
            .catch(() => setError('No se pudo cargar el detalle.'))
            .finally(() => setCargando(false))
    }

    useEffect(() => { cargarDetalle() }, [id_reserva])

    // Vuelve a los 5 pasos. destino: 'servicios' (Agregar servicios → paso 2) o
    // 'pendiente' (Continuar → último paso pendiente según el estado).
    const handleContinuarFlujo = (destino = 'servicios') => {
        if (!datos?.reserva) return
        const r = datos.reserva
        onContinuar?.({ ...r, bodega_id: r.bodega_id ?? r.salon_id }, destino)
    }

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const reserva  = datos?.reserva
    const ordenes  = datos?.ordenes || []
    const salon    = reserva?.Salon
    const evento   = reserva?.Evento
    const de       = reserva?.datos_evento
    const servicios = datos?.servicios_contratados || []
    const cfg      = reserva ? (ESTADO_RESERVA[reserva.estado] || ESTADO_RESERVA.cancelada) : null

    const esPrivado = de?.es_publico === false
    const TABS = [
        ...TABS_BASE,
        ...(esPrivado ? ['Invitaciones'] : []),
        // El pozo existe cuando el evento ya fue creado (al pagar la reserva)
        ...(reserva?.evento_id ? ['Pozo'] : []),
    ]

    return (
        <div className='rd-overlay' onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className='rd-modal'>

                {/* ── Header ── */}
                <div className='rd-header'>
                    <div className='rd-header-titulo'>
                        <FiFileText size={18} />
                        <h2>Reserva #{id_reserva}</h2>
                        {cfg && <span className={`rd-badge ${cfg.clase}`}>{cfg.label}</span>}
                    </div>
                    <button className='rd-cerrar' onClick={onClose} title='Cerrar'><FiX size={20} /></button>
                </div>

                {/* ── Tabs ── */}
                {!cargando && !error && reserva && (
                    <div className='rd-tabs'>
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                className={`rd-tab ${tabActiva === tab ? 'rd-tab-activa' : ''} ${tab === 'Invitaciones' ? 'rd-tab-invitaciones' : ''}`}
                                onClick={() => setTabActiva(tab)}
                            >
                                {tab === 'Invitaciones' ? '💌 Invitaciones' : tab === 'Pozo' ? '💰 Pozo' : tab}
                                {tab === 'Servicios' && servicios.length > 0 && (
                                    <span className='rd-tab-badge'>{servicios.length}</span>
                                )}
                                {tab === 'Pagos' && ordenes.length > 0 && (
                                    <span className='rd-tab-badge'>{ordenes.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Body ── */}
                <div className='rd-body'>
                    {cargando && <p className='rd-loading'>Cargando...</p>}
                    {error    && <p className='rd-error'><FiAlertCircle size={15} /> {error}</p>}

                    {reserva && (
                        <>
                            {/* Fecha límite */}
                            {reserva.estado === 'pendiente_pago' && reserva.fecha_limite_pago && (
                                <div className='rd-limite-banner'>
                                    <FiClock size={14} />
                                    Pagar la seña antes del <strong>{fmtFechaHora(reserva.fecha_limite_pago)}</strong>
                                </div>
                            )}

                            {/* Continuar con la reserva → va al último paso pendiente (ej. Pago) */}
                            {reserva.estado === 'pendiente_pago' && onContinuar && (
                                <button
                                    className='rd-btn-continuar'
                                    onClick={() => handleContinuarFlujo('pendiente')}
                                >
                                    <FiArrowRight size={14} /> Continuar con la reserva
                                </button>
                            )}

                            {/* Guardar reserva (pendiente_pago) */}
                            {reserva.estado === 'pendiente_pago' && onGuardar && (
                                <button
                                    className='rd-btn-guardar'
                                    onClick={() => {
                                        onClose()
                                        onGuardar()
                                        setTimeout(() => {
                                            document.getElementById('carrito-precio-entrada')
                                                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                        }, 350)
                                    }}
                                >
                                    <FiBookmark size={14} /> Guardar reserva
                                </button>
                            )}

                            {/* Reiterar reserva cancelada */}
                            {reserva.estado === 'cancelada' && onReiterar && (
                                <div className='rd-reiterar-banner'>
                                    <div className='rd-reiterar-texto'>
                                        <FiRefreshCw size={14} />
                                        <span>Esta reserva fue cancelada. Podés volver a realizarla con los mismos datos del evento.</span>
                                    </div>
                                    <button
                                        className='rd-btn-reiterar'
                                        onClick={() => onReiterar(reserva)}
                                    >
                                        <FiRefreshCw size={14} /> Reiterar reserva
                                    </button>
                                </div>
                            )}

                            {/* ══════════ TAB: EVENTO ══════════ */}
                            {tabActiva === 'Evento' && (
                                <div className='rd-tab-content'>
                                    {(de?.imagen || evento?.imagen) && (
                                        <img
                                            src={de?.imagen || evento?.imagen}
                                            alt='Evento'
                                            className='rd-imagen-hero'
                                        />
                                    )}
                                    <div className='rd-grid'>
                                        <div className='rd-campo rd-campo-full'>
                                            <span className='rd-label'>Nombre</span>
                                            <span className='rd-valor rd-valor-grande'>{de?.nombre || evento?.nombre || '—'}</span>
                                        </div>
                                        {de?.descripcion && (
                                            <div className='rd-campo rd-campo-full'>
                                                <span className='rd-label'>Descripción</span>
                                                <span className='rd-valor rd-valor-desc'>{de.descripcion}</span>
                                            </div>
                                        )}
                                        <div className='rd-campo'>
                                            <span className='rd-label'><FiCalendar size={12} /> Fecha del evento</span>
                                            <span className='rd-valor'>{fmtFecha(reserva.fecha)}</span>
                                        </div>
                                        <div className='rd-campo'>
                                            <span className='rd-label'><FiUsers size={12} /> Cupo</span>
                                            <span className='rd-valor'>{de?.cupo || evento?.cupo || '—'} personas</span>
                                        </div>
                                        <div className='rd-campo'>
                                            <span className='rd-label'>Entrada</span>
                                            <span className='rd-valor'>
                                                {de?.cobrar_entrada
                                                    ? `$${fmt(de.precio || evento?.precio || 0)}`
                                                    : 'Entrada libre'}
                                            </span>
                                        </div>
                                        <div className='rd-campo'>
                                            <span className='rd-label'>Visibilidad</span>
                                            <span className='rd-valor'>{de?.es_publico ? '🌐 Público' : '🔒 Privado'}</span>
                                        </div>
                                        {evento && (
                                            <div className='rd-campo'>
                                                <span className='rd-label'>Estado del evento</span>
                                                <span className='rd-valor'>
                                                    {evento.estado === 'activo' ? '✅ Activo' : evento.estado === 'borrador' ? '📝 Borrador' : '❌ Cancelado'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Resumen de pago */}
                                    {(() => {
                                        const invitadosEfectivos = Number(de?.numInvitados) > 0 ? Number(de.numInvitados) : (Number(de?.cupo) || 0)
                                        const totalServicios = servicios.reduce((acc, s) => acc + calcSubtotal(s, invitadosEfectivos), 0)
                                        const baseEvento = Number(reserva.monto_alquiler) + totalServicios
                                        const comisionPct = Number(reserva.comision_cliente_porcentaje) || 0
                                        // Si ya hay un pago aprobado, el total real es lo efectivamente cobrado
                                        // (llevado a 100% si fue seña), para que el resumen coincida EXACTO con
                                        // lo pagado. Si aún no se pagó, se estima con la comisión del contrato.
                                        const ordenAprobada = ordenes.find(o => o.estado === 'aprobado')
                                        const cobrado = ordenAprobada ? Number(ordenAprobada.monto_total) : 0
                                        const proporcion = ordenAprobada?.tipo_pago === 'seña' ? 0.30 : 1
                                        const totalEvento = (cobrado > 0 && baseEvento > 0)
                                            ? +(cobrado / proporcion).toFixed(2)
                                            : +(baseEvento * (1 + comisionPct / 100)).toFixed(2)
                                        // Factor efectivo para que las líneas (alquiler/servicios) sumen el total.
                                        const factorComision = baseEvento > 0 ? totalEvento / baseEvento : 1 + comisionPct / 100
                                        const sena = +(totalEvento * 0.30).toFixed(2)
                                        const saldo = +(totalEvento * 0.70).toFixed(2)
                                        return (
                                            <div className='rd-pago-resumen'>
                                                <h4 className='rd-pago-resumen-titulo'><FiDollarSign size={14} /> Resumen de pago</h4>
                                                <div className='rd-pago-fila'>
                                                    <span>Alquiler del salón</span>
                                                    <strong>${fmt(Number(reserva.monto_alquiler) * factorComision)}</strong>
                                                </div>
                                                {totalServicios > 0 && (
                                                    <div className='rd-pago-fila'>
                                                        <span>Servicios adicionales</span>
                                                        <strong>${fmt(totalServicios * factorComision)}</strong>
                                                    </div>
                                                )}
                                                <div className='rd-pago-fila rd-pago-total'>
                                                    <span>Total del evento</span>
                                                    <strong>${fmt(totalEvento)}</strong>
                                                </div>
                                                <div className='rd-pago-fila rd-pago-sena'>
                                                    <span>Seña (30%)</span>
                                                    <strong>${fmt(sena)}</strong>
                                                </div>
                                                <div className='rd-pago-fila rd-pago-saldo'>
                                                    <span>Saldo restante (70%)</span>
                                                    <strong>${fmt(saldo)}</strong>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* ══════════ TAB: SALÓN ══════════ */}
                            {tabActiva === 'Salón' && (
                                <div className='rd-tab-content'>
                                    {salon ? (
                                        <>
                                            {salon.imagen && (
                                                <img src={salon.imagen} alt={salon.nombre} className='rd-imagen-hero' />
                                            )}

                                            <div className='rd-salon-nombre-row'>
                                                <FiHome size={18} />
                                                <h3>{salon.nombre}</h3>
                                            </div>

                                            <div className='rd-grid'>
                                                <div className='rd-campo rd-campo-full'>
                                                    <span className='rd-label'><FiMapPin size={12} /> Dirección</span>
                                                    <span className='rd-valor'>{salon.domicilio}</span>
                                                </div>
                                                {(salon.localidad || salon.provincia) && (
                                                    <div className='rd-campo'>
                                                        <span className='rd-label'>Localidad</span>
                                                        <span className='rd-valor'>
                                                            {[salon.localidad, salon.provincia].filter(Boolean).join(', ')}
                                                        </span>
                                                    </div>
                                                )}
                                                {salon.aforo && (
                                                    <div className='rd-campo'>
                                                        <span className='rd-label'><FiUsers size={12} /> Aforo máximo</span>
                                                        <span className='rd-valor'>{salon.aforo} personas</span>
                                                    </div>
                                                )}
                                                <div className='rd-campo'>
                                                    <span className='rd-label'><FiDollarSign size={12} /> Precio de alquiler</span>
                                                    <span className='rd-valor'>
                                                        ${fmt(Number(reserva.monto_alquiler) * (1 + (Number(reserva.comision_cliente_porcentaje) || 0) / 100))}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Servicios incluidos del salón */}
                                            {salon.servicios_incluidos?.length > 0 && (
                                                <div className='rd-tags-seccion'>
                                                    <span className='rd-label'><FiTag size={12} /> Servicios incluidos en el salón</span>
                                                    <div className='rd-tags'>
                                                        {salon.servicios_incluidos.map((s, i) => (
                                                            <span key={i} className='rd-tag rd-tag-servicio'>{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tipos de evento */}
                                            {salon.tipos_evento?.length > 0 && (
                                                <div className='rd-tags-seccion'>
                                                    <span className='rd-label'><FiCalendar size={12} /> Ideal para</span>
                                                    <div className='rd-tags'>
                                                        {salon.tipos_evento.map((t, i) => (
                                                            <span key={i} className='rd-tag rd-tag-tipo'>{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className='rd-sin-datos'>Sin información del salón.</p>
                                    )}
                                </div>
                            )}

                            {/* ══════════ TAB: SERVICIOS ══════════ */}
                            {tabActiva === 'Servicios' && (
                                <div className='rd-tab-content'>
                                    {servicios.length === 0 ? (
                                        <div className='rd-sin-datos-center'>
                                            <FiPackage size={36} />
                                            <p>Sin servicios adicionales.</p>
                                            {reserva.estado === 'pendiente_pago' ? (
                                                <>
                                                    <span>Podés agregar catering, decoración, sonido y más.</span>
                                                    <button
                                                        className='rd-btn-agregar-servicios'
                                                        onClick={() => handleContinuarFlujo('servicios')}
                                                    >
                                                        <FiPlus size={15} /> Agregar servicios
                                                    </button>
                                                </>
                                            ) : (
                                                <span>Esta reserva no incluyó servicios adicionales.</span>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <p className='rd-servicios-intro'>
                                                {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} adicional{servicios.length !== 1 ? 'es' : ''} contratado{servicios.length !== 1 ? 's' : ''}
                                            </p>
                                            {(() => { const facCom = 1 + (Number(reserva.comision_cliente_porcentaje) || 0) / 100; return (<>
                                            <div className='rd-servicios-lista'>
                                                {servicios.map((s, i) => {
                                                    const invEfectivos = Number(de?.numInvitados) > 0 ? Number(de.numInvitados) : (Number(de?.cupo) || 0)
                                                    const subtotal = calcSubtotal(s, invEfectivos) * facCom
                                                    const etiquetaUnidad = s.tipo_precio === 'por_hora'   ? `× ${s.horas || 1} h`
                                                        : s.tipo_precio === 'por_turno'  ? `× ${s.turnos || 1} turno(s)`
                                                        : s.tipo_precio === 'por_persona' ? `× ${(Number(s.personas) > 0 ? Number(s.personas) : invEfectivos) || 1} pers.`
                                                        : s.cantidad > 1 ? `× ${s.cantidad}` : ''
                                                    return (
                                                        <div key={i} className='rd-servicio-card'>
                                                            {s.imagen && (
                                                                <img src={s.imagen} alt={s.nombre} className='rd-servicio-img' />
                                                            )}
                                                            <div className='rd-servicio-info'>
                                                                <div className='rd-servicio-top'>
                                                                    <strong className='rd-servicio-nombre'>{s.nombre}</strong>
                                                                    {s.categoria && (
                                                                        <span className='rd-servicio-cat'>
                                                                            {CATEGORIA_LABEL[s.categoria] || s.categoria}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {s.descripcion && (
                                                                    <p className='rd-servicio-desc'>{s.descripcion}</p>
                                                                )}
                                                                <div className='rd-servicio-precios'>
                                                                    <span className='rd-servicio-unitario'>
                                                                        ${fmt(Number(s.precio) * facCom)} {TIPO_PRECIO_LABEL[s.tipo_precio] || ''} {etiquetaUnidad}
                                                                    </span>
                                                                    <span className='rd-servicio-subtotal'>
                                                                        Subtotal: <strong>${fmt(subtotal)}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {reserva.estado === 'pendiente_pago' && (
                                                <button
                                                    className='rd-btn-agregar-servicios rd-btn-agregar-mas'
                                                    onClick={() => handleContinuarFlujo('servicios')}
                                                >
                                                    <FiPlus size={14} /> Agregar más servicios
                                                </button>
                                            )}

                                            {/* Total servicios */}
                                            <div className='rd-servicios-total'>
                                                <span>Total servicios adicionales</span>
                                                <strong>
                                                    ${fmt(servicios.reduce((acc, s) => {
                                                        const inv = Number(de?.numInvitados) > 0 ? Number(de.numInvitados) : (Number(de?.cupo) || 0)
                                                        return acc + calcSubtotal(s, inv) * facCom
                                                    }, 0))}
                                                </strong>
                                            </div>
                                        </>) })()}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ══════════ TAB: INVITACIONES ══════════ */}
                            {tabActiva === 'Invitaciones' && esPrivado && (
                                <div className='rd-tab-content'>
                                    <InvitacionesPanel
                                        eventoId={reserva.evento_id}
                                        eventoNombre={evento?.nombre || de?.nombre || 'Evento'}
                                        eventoImagen={de?.imagen || evento?.imagen || null}
                                        eventoPrecio={de?.precio || evento?.precio || null}
                                        eventoFecha={reserva.fecha}
                                        eventoCupo={de?.cupo || evento?.cupo || null}
                                    />
                                </div>
                            )}

                            {/* ══════════ TAB: POZO COMÚN ══════════ */}
                            {tabActiva === 'Pozo' && reserva.evento_id && (
                                <div className='rd-tab-content'>
                                    <PozoPanel eventoId={reserva.evento_id} />
                                </div>
                            )}

                            {/* ══════════ TAB: PAGOS ══════════ */}
                            {tabActiva === 'Pagos' && (
                                <div className='rd-tab-content'>
                                    {ordenes.length === 0 ? (
                                        <div className='rd-sin-datos-center'>
                                            <FiDollarSign size={36} />
                                            <p>Sin historial de pagos todavía.</p>
                                        </div>
                                    ) : (
                                        <div className='rd-ordenes'>
                                            {ordenes.map(o => {
                                                const cfgO = ESTADO_ORDEN[o.estado] || ESTADO_ORDEN.pendiente
                                                const invEf = Number(de?.numInvitados) > 0 ? Number(de.numInvitados) : (Number(de?.cupo) || 0)
                                                const alquiler = (o.items || []).find(i => i.tipo === 'alquiler')
                                                const reales = (o.items || []).filter(i => i.id_servicio)
                                                const serviciosO = reales.filter(i => (i.tipo_item || 'producto') === 'servicio')
                                                const productosO = reales.filter(i => (i.tipo_item || 'producto') === 'producto')
                                                // Base con descuento (sin comisión) de esta orden.
                                                const baseAlq  = alquiler ? Number(alquiler.precio) * (Number(alquiler.cantidad) || 1) : 0
                                                const baseServ = serviciosO.reduce((a, s) => a + calcSubtotal(s, invEf), 0)
                                                const baseProd = productosO.reduce((a, s) => a + calcSubtotal(s, invEf), 0)
                                                const baseTotal = baseAlq + baseServ + baseProd
                                                // La comisión del cliente va SIEMPRE incorporada de forma invisible en
                                                // cada importe. Para una orden ya cobrada derivamos el factor del monto
                                                // REAL cobrado (o.monto_total), así el Total coincide EXACTO con lo
                                                // cobrado sin depender de la comisión vigente del contrato (que pudo
                                                // cambiar). La seña cobra el 30%, por eso se divide por la proporción.
                                                const proporcion = o.tipo_pago === 'seña' ? 0.30 : 1
                                                const cobrado = Number(o.monto_total) || 0
                                                const comisionPct = Number(reserva.comision_cliente_porcentaje) || 0
                                                const factorCom = (cobrado > 0 && baseTotal > 0)
                                                    ? cobrado / (baseTotal * proporcion)
                                                    : 1 + comisionPct / 100
                                                const conCom = (n) => n * factorCom
                                                const totServ = conCom(baseServ)
                                                const totProd = conCom(baseProd)
                                                const montoAlquiler = conCom(baseAlq)
                                                const totalDesglose = montoAlquiler + totServ + totProd

                                                const multLabel = (i) => i.tipo_precio === 'por_persona'
                                                    ? `${(Number(i.personas) > 0 ? Number(i.personas) : invEf) || 1} pers.`
                                                    : i.tipo_precio === 'por_hora' ? `${Number(i.horas) || 1} h`
                                                    : i.tipo_precio === 'por_turno' ? `${Number(i.turnos) || 1} turno(s)`
                                                    : (Number(i.cantidad) || 1) > 1 ? `×${Number(i.cantidad)}` : ''

                                                const renderItem = (i, idx) => {
                                                    const unit = precioUnitarioConDescuento(i)
                                                    const conDesc = unit < Number(i.precio)
                                                    const etq = multLabel(i)
                                                    return (
                                                        <li key={idx} className='rd-pago-item'>
                                                            <span className='rd-pago-item-nombre'>
                                                                {i.nombre}{etq && <small> · {etq}</small>}
                                                                {conDesc && <span className='rd-pago-desc'>-{i.descuento_porcentaje}%</span>}
                                                            </span>
                                                            <span className='rd-pago-item-sub'>
                                                                {conDesc && <s className='rd-pago-tachado'>${fmt(conCom(Number(i.precio) * (Number(i.cantidad) || 1) * (i.tipo_precio === 'por_persona' ? ((Number(i.personas) > 0 ? Number(i.personas) : invEf) || 1) : i.tipo_precio === 'por_hora' ? (Number(i.horas) || 1) : i.tipo_precio === 'por_turno' ? (Number(i.turnos) || 1) : 1)))}</s>}
                                                                ${fmt(conCom(calcSubtotal(i, invEf)))}
                                                            </span>
                                                        </li>
                                                    )
                                                }
                                                return (
                                                    <div key={o.id_orden} className='rd-orden-item'>
                                                        <div className='rd-orden-top'>
                                                            <span className='rd-orden-tipo'>
                                                                {o.tipo_pago === 'seña' ? '🎯 Seña (30%)' : o.tipo_pago === 'total' ? '✅ Pago total' : 'Pago'}
                                                            </span>
                                                            <span className={`rd-orden-estado ${cfgO.clase}`}>
                                                                {cfgO.icono} {cfgO.label}
                                                            </span>
                                                        </div>
                                                        <div className='rd-orden-info'>
                                                            <span>Cobrado: <strong>${fmt(o.monto_total)}</strong></span>
                                                            <span>{fmtFechaHora(o.fecha_creacion)}</span>
                                                            {o.mp_payment_id && (
                                                                <span className='rd-mp-id'>MP: {o.mp_payment_id}</span>
                                                            )}
                                                        </div>

                                                        {/* Desglose: salón / servicios / productos */}
                                                        <div className='rd-pago-desglose'>
                                                            {alquiler && (
                                                                <div className='rd-pago-grupo'>
                                                                    <div className='rd-pago-linea'>
                                                                        <span>🏛️ {alquiler.nombre}</span>
                                                                        <span className='rd-pago-item-sub'>${fmt(montoAlquiler)}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {serviciosO.length > 0 && (
                                                                <div className='rd-pago-grupo'>
                                                                    <span className='rd-pago-grupo-tit'>🎧 Servicios</span>
                                                                    <ul className='rd-pago-items'>{serviciosO.map(renderItem)}</ul>
                                                                    <div className='rd-pago-subtotal'><span>Subtotal servicios</span><strong>${fmt(totServ)}</strong></div>
                                                                </div>
                                                            )}
                                                            {productosO.length > 0 && (
                                                                <div className='rd-pago-grupo'>
                                                                    <span className='rd-pago-grupo-tit'>🥤 Productos</span>
                                                                    <ul className='rd-pago-items'>{productosO.map(renderItem)}</ul>
                                                                    <div className='rd-pago-subtotal'><span>Subtotal productos</span><strong>${fmt(totProd)}</strong></div>
                                                                </div>
                                                            )}
                                                            {(alquiler || serviciosO.length > 0 || productosO.length > 0) && (
                                                                <div className='rd-pago-total-fila'><span>Total</span><strong>${fmt(totalDesglose)}</strong></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ReservaDetalleModal
