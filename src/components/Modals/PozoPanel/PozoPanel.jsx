import React, { useEffect, useState } from 'react'
import { getPozoEvento, crearMovimientoPozo } from '../../../services/pozoServices'
import {
    FiDollarSign, FiTrendingUp, FiTrendingDown, FiRefreshCw,
    FiCheckCircle, FiClock, FiUsers, FiArrowDownCircle, FiArrowUpCircle, FiCreditCard
} from 'react-icons/fi'
import './PozoPanel.css'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR')
const fmtFechaHora = (f) => f
    ? new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

const TIPO_MOV = {
    ingreso_entrada: { label: 'Entrada pagada',   icono: <FiArrowDownCircle size={15}/>, clase: 'pozo-mov--ingreso', signo: '+' },
    pago_costo:      { label: 'Pago de costo',    icono: <FiCreditCard size={15}/>,      clase: 'pozo-mov--costo',   signo: '−' },
    retiro_ganancia: { label: 'Retiro de ganancia', icono: <FiArrowUpCircle size={15}/>, clase: 'pozo-mov--retiro',  signo: '−' },
}

/**
 * Pozo común del evento: recaudación interna de entradas (trazada desde las
 * órdenes aprobadas de MP), con egresos manuales del organizador para aplicar
 * al costo del evento o retirar su ganancia.
 */
export const PozoPanel = ({ eventoId }) => {
    const [pozo, setPozo] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')

    // Form de egreso
    const [formTipo, setFormTipo] = useState(null) // 'pago_costo' | 'retiro_ganancia' | null
    const [monto, setMonto] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [feedback, setFeedback] = useState('')

    const cargar = async () => {
        setCargando(true)
        setError('')
        try {
            const data = await getPozoEvento(eventoId)
            setPozo(data)
        } catch (err) {
            setError(err?.response?.data?.message || 'No se pudo cargar el pozo del evento.')
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { if (eventoId) cargar() }, [eventoId])

    const handleEgreso = async (e) => {
        e.preventDefault()
        const montoNum = Number(monto)
        if (!(montoNum > 0)) return
        setEnviando(true)
        setFeedback('')
        try {
            const r = await crearMovimientoPozo(eventoId, { tipo: formTipo, monto: montoNum, descripcion })
            setFeedback(r.message)
            setFormTipo(null)
            setMonto('')
            setDescripcion('')
            await cargar()
            setTimeout(() => setFeedback(''), 4000)
        } catch (err) {
            setFeedback(err?.response?.data?.message || 'No se pudo registrar el movimiento.')
        } finally {
            setEnviando(false)
        }
    }

    if (!eventoId) {
        return <div className='pozo-vacio'><FiDollarSign size={32}/><p>El evento todavía no fue creado (se activa al pagar la reserva).</p></div>
    }
    if (cargando) return <div className='pozo-vacio'><FiRefreshCw size={26} className='pozo-girando'/><p>Cargando pozo...</p></div>
    if (error)    return <div className='pozo-vacio'><p className='pozo-error'>{error}</p></div>
    if (!pozo)    return null

    const invitacionesPagadas    = (pozo.invitaciones || []).filter(i => i.pagada)
    const invitacionesPendientes = (pozo.invitaciones || []).filter(i => !i.pagada && i.estado !== 'pendiente')

    return (
        <div className='pozo-panel'>

            {/* ── Resumen ── */}
            <div className='pozo-resumen'>
                <div className='pozo-card pozo-card--recaudado'>
                    <FiTrendingUp size={18}/>
                    <span className='pozo-card-label'>Recaudado</span>
                    <strong>${fmt(pozo.total_recaudado)}</strong>
                </div>
                <div className='pozo-card pozo-card--costos'>
                    <FiCreditCard size={18}/>
                    <span className='pozo-card-label'>Aplicado a costos</span>
                    <strong>${fmt(pozo.total_pagado_costos)}</strong>
                </div>
                <div className='pozo-card pozo-card--retirado'>
                    <FiTrendingDown size={18}/>
                    <span className='pozo-card-label'>Retirado</span>
                    <strong>${fmt(pozo.total_retirado)}</strong>
                </div>
                <div className='pozo-card pozo-card--saldo'>
                    <FiDollarSign size={18}/>
                    <span className='pozo-card-label'>Saldo disponible</span>
                    <strong>${fmt(pozo.saldo)}</strong>
                </div>
            </div>

            {/* ── Contexto del costo del evento ── */}
            {pozo.costo && (
                <div className='pozo-costo-info'>
                    Pagaste <strong>${fmt(pozo.costo.pagado_organizador)}</strong>
                    {pozo.costo.tipo_pago === 'seña' && ' (seña del 30%)'}
                    {pozo.costo.tipo_pago === 'total' && ' (pago total)'}
                    {' '}por esta reserva · Alquiler del salón: ${fmt(pozo.costo.monto_alquiler)}
                </div>
            )}

            {/* ── Acciones ── */}
            <div className='pozo-acciones'>
                <button
                    className='pozo-btn pozo-btn--costo'
                    onClick={() => { setFormTipo(formTipo === 'pago_costo' ? null : 'pago_costo'); setFeedback('') }}
                    disabled={pozo.saldo <= 0}
                >
                    <FiCreditCard size={15}/> Aplicar al costo del evento
                </button>
                <button
                    className='pozo-btn pozo-btn--retiro'
                    onClick={() => { setFormTipo(formTipo === 'retiro_ganancia' ? null : 'retiro_ganancia'); setFeedback('') }}
                    disabled={pozo.saldo <= 0}
                >
                    <FiArrowUpCircle size={15}/> Retirar ganancia
                </button>
            </div>

            {formTipo && (
                <form className='pozo-form' onSubmit={handleEgreso}>
                    <span className='pozo-form-titulo'>
                        {formTipo === 'pago_costo' ? 'Aplicar fondos al costo del evento' : 'Retirar ganancia del pozo'}
                    </span>
                    <div className='pozo-form-row'>
                        <label>Monto $</label>
                        <input
                            type='number' min='1' step='0.01' max={pozo.saldo}
                            value={monto}
                            onChange={e => setMonto(e.target.value)}
                            placeholder={`Hasta ${fmt(pozo.saldo)}`}
                            required
                        />
                        <button type='button' className='pozo-btn-max' onClick={() => setMonto(String(pozo.saldo))}>Todo</button>
                    </div>
                    <input
                        type='text'
                        className='pozo-form-desc'
                        value={descripcion}
                        onChange={e => setDescripcion(e.target.value)}
                        placeholder='Descripción (opcional)'
                        maxLength={300}
                    />
                    <button type='submit' className='pozo-btn pozo-btn--confirmar' disabled={enviando || !(Number(monto) > 0)}>
                        {enviando ? 'Registrando...' : 'Confirmar'}
                    </button>
                </form>
            )}

            {feedback && <div className='pozo-feedback'>{feedback}</div>}

            {/* ── Invitados que pagaron ── */}
            <div className='pozo-seccion'>
                <h4><FiUsers size={15}/> Entradas de invitados</h4>
                {(pozo.invitaciones || []).length === 0 ? (
                    <p className='pozo-hint'>Todavía no hay invitaciones confirmadas para este evento.</p>
                ) : (
                    <div className='pozo-invitaciones'>
                        {invitacionesPagadas.map(inv => (
                            <div key={inv.id_invitacion} className='pozo-inv pozo-inv--pagada'>
                                <FiCheckCircle size={14}/>
                                <span className='pozo-inv-nombre'>{inv.nombre_invitado || 'Invitado'}</span>
                                <span className='pozo-inv-detalle'>
                                    {inv.invitados?.length > 0 ? inv.invitados.join(', ') : `${inv.num_invitados} invitado(s)`}
                                </span>
                                <strong className='pozo-inv-monto'>${fmt(inv.monto)}</strong>
                            </div>
                        ))}
                        {invitacionesPendientes.map(inv => (
                            <div key={inv.id_invitacion} className='pozo-inv pozo-inv--pendiente'>
                                <FiClock size={14}/>
                                <span className='pozo-inv-nombre'>{inv.nombre_invitado || 'Invitado'}</span>
                                <span className='pozo-inv-detalle'>confirmó pero no pagó aún</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Movimientos ── */}
            <div className='pozo-seccion'>
                <h4><FiDollarSign size={15}/> Movimientos del pozo</h4>
                {(pozo.movimientos || []).length === 0 ? (
                    <p className='pozo-hint'>Sin movimientos todavía. Cuando un invitado pague su entrada, aparece acá.</p>
                ) : (
                    <div className='pozo-movs'>
                        {pozo.movimientos.map(m => {
                            const cfg = TIPO_MOV[m.tipo] || TIPO_MOV.ingreso_entrada
                            return (
                                <div key={m.id_movimiento} className={`pozo-mov ${cfg.clase}`}>
                                    {cfg.icono}
                                    <div className='pozo-mov-info'>
                                        <span className='pozo-mov-tipo'>{cfg.label}</span>
                                        <span className='pozo-mov-desc'>
                                            {m.descripcion}
                                            {m.persona && ` · ${m.persona.nombre} ${m.persona.apellido || ''}`}
                                        </span>
                                        <span className='pozo-mov-fecha'>{fmtFechaHora(m.fecha)}{m.orden_id ? ` · Orden #${m.orden_id}` : ''}</span>
                                    </div>
                                    <strong className='pozo-mov-monto'>{cfg.signo}${fmt(m.monto)}</strong>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PozoPanel
