import React from 'react'
import { FiX, FiCheck, FiSlash, FiUser, FiCalendar, FiClock, FiDollarSign, FiHash } from 'react-icons/fi'
import './ReservaDetalleHorizontal.css'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`
const fmtFecha = (f) => f
    ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : '—'

const nombreDe = (r) => r.datos_evento?.manual
    ? (r.datos_evento.nombre_organizador || 'Sin nombre')
    : `${r.Persona?.nombre || ''} ${r.Persona?.apellido || ''}`.trim() || 'Sin nombre'
const emailDe = (r) => r.datos_evento?.manual
    ? (r.datos_evento.email_organizador || '—')
    : (r.Persona?.email || '—')

// Estado de la RESERVA (ciclo de vida) — separado del pago
const estadoReservaInfo = (r) => {
    if (r.estado === 'cancelada')      return { label: 'Cancelada',  cls: 'rdh-b-cancelada' }
    if (r.estado === 'pendiente_pago') return { label: 'Pendiente',  cls: 'rdh-b-pendiente' }
    return { label: 'Confirmada', cls: 'rdh-b-confirmada' } // seña_abonada / confirmada
}
// Estado del PAGO
const estadoPagoInfo = (r) => {
    if (r.estado === 'confirmada')   return { label: 'Pagado total',       cls: 'rdh-b-confirmada' }
    if (r.estado === 'seña_abonada') return { label: 'Seña abonada (30%)', cls: 'rdh-b-sena' }
    if (r.estado === 'cancelada')    return Number(r.monto_abonado) > 0
        ? { label: 'Reembolso pendiente', cls: 'rdh-b-pendiente' }
        : { label: 'Sin pago', cls: 'rdh-b-cancelada' }
    return { label: 'Sin pagar', cls: 'rdh-b-pendiente' }
}

// Detalle horizontal de una reserva (estilo tabla). Usado en el modal (click desde
// el calendario) y arriba de la lista (click desde el listado).
const ReservaDetalleHorizontal = ({ reserva, onCerrar, onAccion, accionando }) => {
    if (!reserva) return null
    const r = reserva
    const total = Number(r.monto_alquiler) || 0
    const sena = Number(r.monto_sena) || +(total * 0.30).toFixed(2)
    // Abonado respecto del alquiler del salón: con seña → la seña (30%); total → todo.
    const abonado = r.estado === 'confirmada'   ? total
        : r.estado === 'seña_abonada'           ? sena
        : r.estado === 'cancelada'              ? (Number(r.monto_abonado) || 0)
        : 0
    const saldo = Math.max(0, total - abonado)
    const eReserva = estadoReservaInfo(r)
    const ePago = estadoPagoInfo(r)
    const esManual = !!r.datos_evento?.manual

    return (
        <div className='rdh'>
            <div className='rdh-head'>
                <div className='rdh-head-titulo'>
                    <FiHash size={15} /> Reserva #{r.id_reserva}
                    <span className={`rdh-tipo ${esManual ? 'rdh-tipo-ext' : 'rdh-tipo-int'}`}>
                        {esManual ? 'Externa' : 'Interna'}
                    </span>
                </div>
                {onCerrar && (
                    <button className='rdh-cerrar' onClick={onCerrar}><FiX size={18} /></button>
                )}
            </div>

            <div className='rdh-cols'>
                <div className='rdh-col rdh-col-ancha'>
                    <span className='rdh-label'><FiUser size={12} /> Huésped / Organizador</span>
                    <span className='rdh-val rdh-val-fuerte'>{nombreDe(r)}</span>
                    <span className='rdh-sub'>{emailDe(r)}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'><FiCalendar size={12} /> Fecha del evento</span>
                    <span className='rdh-val'>{fmtFecha(r.fecha)}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'><FiClock size={12} /> Reservado el</span>
                    <span className='rdh-val'>{fmtFecha(r.createdAt || r.fecha_creacion)}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'>Estado de la reserva</span>
                    <span className={`rdh-badge ${eReserva.cls}`}>{eReserva.label}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'>Estado del pago</span>
                    <span className={`rdh-badge ${ePago.cls}`}>{ePago.label}</span>
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'><FiDollarSign size={12} /> Abonado</span>
                    <span className='rdh-val rdh-val-fuerte rdh-verde'>{fmt(abonado)}</span>
                    {total > 0 && <span className='rdh-sub'>de {fmt(total)}</span>}
                </div>
                <div className='rdh-col'>
                    <span className='rdh-label'>Saldo</span>
                    <span className={`rdh-val ${saldo > 0 ? 'rdh-rojo' : 'rdh-verde'}`}>{fmt(saldo)}</span>
                </div>
            </div>

            {/* Acciones para reservas con seña abonada (el dueño confirma o cancela) */}
            {r.estado === 'seña_abonada' && onAccion && (
                <div className='rdh-acciones'>
                    <button
                        className='rdh-btn rdh-btn-ok'
                        disabled={accionando}
                        onClick={() => onAccion(r.id_reserva, 'confirmada')}
                    >
                        <FiCheck size={15} /> Confirmar reserva
                    </button>
                    <button
                        className='rdh-btn rdh-btn-no'
                        disabled={accionando}
                        onClick={() => { if (window.confirm('¿Cancelar esta reserva?')) onAccion(r.id_reserva, 'cancelada') }}
                    >
                        <FiSlash size={15} /> Cancelar
                    </button>
                </div>
            )}
        </div>
    )
}

export default ReservaDetalleHorizontal
