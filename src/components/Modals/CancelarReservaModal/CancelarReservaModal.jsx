import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCancelacionPreview, cancelarReserva } from '../../../services/reservaServices'
import { FiX, FiAlertTriangle, FiInfo, FiCheck } from 'react-icons/fi'
import './CancelarReservaModal.css'

const MOTIVOS = [
    { id: 'voluntaria',    label: 'Cancelación voluntaria', desc: 'Decidís no realizar el evento. Aplica la escala de reembolso según la anticipación.' },
    { id: 'fuerza_mayor',  label: 'Fuerza mayor / caso fortuito', desc: 'Hecho imprevisible e inevitable (catástrofe, fallecimiento, prohibición estatal). Reembolso íntegro.' },
    { id: 'arrepentimiento', label: 'Arrepentimiento', desc: 'Derecho legal dentro de los 10 días de la compra (Ley 24.240), si el evento no ocurrió.' },
]

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`

const CancelarReservaModal = ({ reserva, onClose, onCancelada }) => {
    const [motivo, setMotivo]     = useState('voluntaria')
    const [preview, setPreview]   = useState(null)
    const [cargando, setCargando] = useState(true)
    const [confirmando, setConfirmando] = useState(false)
    const [error, setError]       = useState(null)
    const [resultado, setResultado] = useState(null)

    const esPaga = reserva?.estado === 'seña_abonada' || reserva?.estado === 'confirmada'

    useEffect(() => {
        if (!esPaga) { setCargando(false); return }
        let vivo = true
        setCargando(true); setError(null)
        getCancelacionPreview(reserva.id_reserva, motivo)
            .then(d => { if (vivo) setPreview(d) })
            .catch(() => { if (vivo) setError('No se pudo calcular el reembolso.') })
            .finally(() => { if (vivo) setCargando(false) })
        return () => { vivo = false }
    }, [motivo, esPaga, reserva?.id_reserva])

    const handleConfirmar = async () => {
        setConfirmando(true); setError(null)
        try {
            const res = await cancelarReserva(reserva.id_reserva, motivo)
            // Mostrar el resultado de la ejecución del reembolso antes de cerrar
            setResultado(res)
        } catch (err) {
            setError(err?.response?.data?.message || 'Error al cancelar la reserva.')
            setConfirmando(false)
        }
    }

    // Etiqueta legible del estado de ejecución del reembolso real (MercadoPago)
    const estadoEjecucionTexto = (est) => ({
        ejecutado: '✅ Reembolso ejecutado y acreditándose',
        parcial:   '⚠️ Reembolso parcial: algunos pagos no se pudieron devolver',
        error:     '⚠️ No se pudo ejecutar el reembolso automático; quedó pendiente de revisión',
        sin_pagos: 'Sin pagos a reembolsar',
    }[est] || 'Reembolso pendiente de ejecución')

    const pct = preview?.porcentaje_reembolso

    return createPortal(
        <div className='cxl-overlay' onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className='cxl-modal'>
                <div className='cxl-header'>
                    <div className='cxl-header-titulo'>
                        <FiAlertTriangle size={18} />
                        <h2>Cancelar reserva #{reserva.id_reserva}</h2>
                    </div>
                    <button className='cxl-cerrar' onClick={onClose}><FiX size={20} /></button>
                </div>

                <div className='cxl-body'>
                    {resultado ? (
                        <div className='cxl-final'>
                            <FiCheck size={40} className='cxl-final-icon' />
                            <h3>Reserva cancelada</h3>
                            {resultado.requiere_reembolso ? (
                                <>
                                    <p className='cxl-final-monto'>
                                        Reembolso: <strong>{resultado.reembolso?.porcentaje_reembolso}%</strong> · {fmt(resultado.reembolso?.monto_reembolso)}
                                    </p>
                                    <p className='cxl-final-estado'>{estadoEjecucionTexto(resultado.ejecucion?.estado)}</p>
                                </>
                            ) : (
                                <p className='cxl-final-estado'>No había pagos que reembolsar.</p>
                            )}
                        </div>
                    ) : !esPaga ? (
                        <p className='cxl-sinpago'>
                            <FiInfo size={16} /> Esta reserva no tiene pagos acreditados: se cancela sin reembolso.
                        </p>
                    ) : (
                        <>
                            <p className='cxl-intro'>Elegí el motivo de la cancelación. El reembolso se calcula según la
                                <strong> Ley de Defensa del Consumidor</strong> y la escala por anticipación.</p>

                            <div className='cxl-motivos'>
                                {MOTIVOS.map(m => (
                                    <label key={m.id} className={`cxl-motivo ${motivo === m.id ? 'cxl-motivo--sel' : ''}`}>
                                        <input type='radio' name='motivo' value={m.id}
                                            checked={motivo === m.id}
                                            onChange={() => setMotivo(m.id)} />
                                        <div>
                                            <span className='cxl-motivo-label'>{m.label}</span>
                                            <span className='cxl-motivo-desc'>{m.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {cargando ? (
                                <p className='cxl-cargando'>Calculando reembolso…</p>
                            ) : preview?.requiere_reembolso ? (
                                <div className={`cxl-resumen ${pct >= 100 ? 'cxl-resumen--full' : pct === 0 ? 'cxl-resumen--none' : ''}`}>
                                    <div className='cxl-resumen-pct'>
                                        <span className='cxl-resumen-num'>{pct}%</span>
                                        <span className='cxl-resumen-cap'>de reembolso</span>
                                    </div>
                                    <div className='cxl-resumen-detalle'>
                                        <div><span>Abonado</span><strong>{fmt(preview.monto_abonado)}</strong></div>
                                        <div><span>Te reembolsan</span><strong className='cxl-verde'>{fmt(preview.monto_reembolso)}</strong></div>
                                        <div><span>Retención</span><strong className='cxl-rojo'>{fmt(preview.monto_retenido)}</strong></div>
                                        <div className='cxl-tramo'><FiInfo size={12} /> {preview.tramo} · faltan {preview.dias_antelacion} día(s)</div>
                                    </div>
                                </div>
                            ) : preview ? (
                                <p className='cxl-sinpago'><FiInfo size={16} /> {preview.message || 'Sin reembolso a calcular.'}</p>
                            ) : null}
                        </>
                    )}

                    {error && <p className='cxl-error'>{error}</p>}
                </div>

                <div className='cxl-footer'>
                    {resultado ? (
                        <button className='cxl-btn cxl-btn--peligro' onClick={() => onCancelada?.(resultado)}>
                            <FiCheck size={15} /> Cerrar
                        </button>
                    ) : (
                        <>
                            <button className='cxl-btn cxl-btn--ghost' onClick={onClose} disabled={confirmando}>
                                No cancelar
                            </button>
                            <button className='cxl-btn cxl-btn--peligro' onClick={handleConfirmar} disabled={confirmando || (esPaga && cargando)}>
                                {confirmando ? 'Cancelando…' : <><FiCheck size={15} /> Confirmar cancelación</>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

export default CancelarReservaModal
