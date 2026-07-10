import React from 'react'
import { FiX, FiCheck, FiSlash, FiUser, FiCalendar, FiHome, FiPackage } from 'react-icons/fi'
import '../MiSalonScreen/ReservaDetalleHorizontal.css'

const fmtFecha = (f) => f
    ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : '—'

// Estado del EVENTO (reserva) — separado del pago
const estadoEventoInfo = (r) => {
    if (r.estado === 'cancelada')      return { label: 'Cancelada', cls: 'rdh-b-cancelada' }
    if (r.estado === 'pendiente_pago') return { label: 'Pendiente', cls: 'rdh-b-pendiente' }
    return { label: 'Confirmada', cls: 'rdh-b-confirmada' }
}
const estadoPagoInfo = (r) => {
    if (r.estado === 'confirmada')   return { label: 'Pagado total',       cls: 'rdh-b-confirmada' }
    if (r.estado === 'seña_abonada') return { label: 'Seña abonada (30%)', cls: 'rdh-b-sena' }
    if (r.estado === 'cancelada')    return { label: 'Sin pago', cls: 'rdh-b-cancelada' }
    return { label: 'Sin pagar', cls: 'rdh-b-pendiente' }
}
const confirmacionInfo = (estadoAgenda) => {
    if (estadoAgenda === 'confirmada') return { label: 'Confirmada', cls: 'rdh-b-confirmada' }
    if (estadoAgenda === 'cancelada')  return { label: 'Cancelada',  cls: 'rdh-b-cancelada' }
    return { label: 'Sin confirmar', cls: 'rdh-b-pendiente' }
}

// Detalle horizontal de una reserva para el PROVEEDOR (sus servicios + su confirmación)
const ReservaDetalleProveedorHorizontal = ({ reserva, estadoAgenda, estadoMostrado, onCerrar, onConfirmar, onCancelar, accionando }) => {
    if (!reserva) return null
    const r = reserva
    const eEvento = estadoEventoInfo(r)
    const ePago = estadoPagoInfo(r)
    const eConf = confirmacionInfo(estadoAgenda)
    const organizador = `${r.Persona?.nombre || ''} ${r.Persona?.apellido || ''}`.trim() || '—'
    const servicios = r.mis_servicios || []
    // Cantidad realmente solicitada de cada ítem según su tipo de precio:
    // por_persona → personas, por_hora → horas, por_turno → turnos, si no → cantidad.
    const cantidadSolicitada = (s) => {
        const base = Number(s.cantidad) || 1
        if (s.tipo_precio === 'por_persona' && Number(s.personas) > 0) return Number(s.personas) * base
        if (s.tipo_precio === 'por_hora'    && Number(s.horas) > 0)    return Number(s.horas) * base
        if (s.tipo_precio === 'por_turno'   && Number(s.turnos) > 0)   return Number(s.turnos) * base
        return base
    }
    const totalSolicitado = servicios.reduce((acc, s) => acc + cantidadSolicitada(s), 0)

    return (
        <div className='rdh'>
            <div className='rdh-head'>
                <div className='rdh-head-titulo'>
                    Reserva #{r.id_reserva}
                    <span className='rdh-tipo rdh-tipo-int'>Solicitud de servicio</span>
                </div>
                {onCerrar && <button className='rdh-cerrar' onClick={onCerrar}><FiX size={18} /></button>}
            </div>

            <div className='rdh-cols'>
                <div className='rdh-col rdh-col-ancha'>
                    <span className='rdh-label'><FiUser size={12} /> Organizador</span>
                    <span className='rdh-val rdh-val-fuerte'>{organizador}</span>
                    <span className='rdh-sub'>{r.Persona?.email || '—'}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'><FiHome size={12} /> Salón</span>
                    <span className='rdh-val'>{r.Salon?.nombre || '—'}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'><FiCalendar size={12} /> Fecha del evento</span>
                    <span className='rdh-val'>{fmtFecha(r.fecha)}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'>Estado del evento</span>
                    <span className={`rdh-badge ${eEvento.cls}`}>{eEvento.label}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'>Estado del pago</span>
                    <span className={`rdh-badge ${ePago.cls}`}>{ePago.label}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'>Tu confirmación</span>
                    <span className={`rdh-badge ${eConf.cls}`}>{eConf.label}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'><FiPackage size={12} /> Tus servicios</span>
                    {servicios.length > 0 ? (
                        <>
                            {servicios.map((s, i) => (
                                <span key={i} className='rdh-sub'>
                                    {s.nombre || s.titulo || 'Servicio'}{' '}
                                    <span style={{ whiteSpace: 'nowrap' }}>×{cantidadSolicitada(s)}</span>
                                </span>
                            ))}
                            <span className='rdh-val rdh-val-fuerte' style={{ marginTop: 4 }}>
                                Total: {totalSolicitado} unidad{totalSolicitado !== 1 ? 'es' : ''}
                            </span>
                        </>
                    ) : <span className='rdh-sub'>—</span>}
                </div>
            </div>

            <div className='rdh-acciones'>
                {estadoMostrado !== 'confirmada' && onConfirmar && (
                    <button className='rdh-btn rdh-btn-ok' disabled={accionando} onClick={onConfirmar}>
                        <FiCheck size={15} /> Confirmar solicitud
                    </button>
                )}
                {estadoMostrado !== 'cancelada' && onCancelar && (
                    <button className='rdh-btn rdh-btn-no' disabled={accionando} onClick={onCancelar}>
                        <FiSlash size={15} /> Cancelar solicitud
                    </button>
                )}
            </div>
        </div>
    )
}

export default ReservaDetalleProveedorHorizontal
